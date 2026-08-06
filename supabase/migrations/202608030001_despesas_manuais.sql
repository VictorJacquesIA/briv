-- Despesas manuais lançadas diretamente contra um centro de custo (item de
-- orçamento da obra), sem passar pelo fluxo estruturado de Compras
-- (solicitação → cotação → pedido) nem pelos fluxos de serviço
-- (caçambas/desmobilização). Pode ser vinculada a um item de orçamento de
-- QUALQUER tipo (Insumos, Mão de Obra ou Serviços) — por isso, ao contrário
-- de cacambas, não há trigger restringindo o tipo do centro de custo aceito.
create table public.despesas_manuais (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  orcamento_item_id uuid references public.obra_orcamento_itens(id) on delete set null,
  descricao text not null,
  valor numeric(14, 2) not null check (valor > 0),
  data_despesa date not null default current_date,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_despesas_manuais_obra_id on public.despesas_manuais(obra_id);
create index idx_despesas_manuais_orcamento_item_id on public.despesas_manuais(orcamento_item_id);

create trigger set_despesas_manuais_updated_at
before update on public.despesas_manuais
for each row execute function public.set_updated_at();

alter table public.despesas_manuais enable row level security;

create policy "despesas_manuais_tenant_select"
on public.despesas_manuais for select
using (public.same_cliente(cliente_id));

-- Mesma política de obra_orcamento_itens: só adm_geral/compras escrevem
-- (edição direta de orçamento) — diferente da política mais permissiva de
-- cacambas, que também libera gestor_obra via obra_usuarios.
create policy "despesas_manuais_admin_compras_write"
on public.despesas_manuais for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

-- View de orçado x realizado ganha despesas_realizado, somando as despesas
-- manuais vinculadas a cada item — apendada como ÚLTIMA coluna do SELECT
-- (CREATE OR REPLACE VIEW exige que colunas existentes mantenham
-- nome/posição, senão: ERROR 42P16 cannot change name of view column).
create or replace view public.v_obra_orcamento_realizado
with (security_invoker = true) as
select
  oi.id as orcamento_item_id,
  oi.obra_id,
  oi.cliente_id,
  oi.descricao,
  oi.categoria,
  oi.valor_orcado,
  coalesce(sum(ci.valor_total) filter (
    where s.status in ('pdf_gerado', 'pedido_programado', 'pedido_enviado', 'finalizada')
  ), 0) as material_realizado,
  coalesce((
    select sum(l.valor)
    from public.lancamentos_mo l
    where l.orcamento_item_id = oi.id and l.status = 'confirmado' and l.tipo = 'solicitacao'
  ), 0)::numeric(14,2) as mo_realizado,
  oi.tipo,
  coalesce((
    select sum(c.valor)
    from public.cacambas c
    where c.orcamento_item_id = oi.id
  ), 0)::numeric(14,2) as servicos_realizado,
  coalesce((
    select sum(d.valor)
    from public.despesas_manuais d
    where d.orcamento_item_id = oi.id
  ), 0)::numeric(14,2) as despesas_realizado
from public.obra_orcamento_itens oi
left join public.solicitacao_itens si on si.orcamento_item_id = oi.id
left join public.solicitacoes s on s.id = si.solicitacao_id
left join public.cotacoes cot on cot.solicitacao_id = s.id and cot.fornecedor_id = s.fornecedor_aprovado_id
left join public.cotacao_itens ci on ci.cotacao_id = cot.id and ci.solicitacao_item_id = si.id
group by oi.id, oi.obra_id, oi.cliente_id, oi.descricao, oi.categoria, oi.valor_orcado, oi.tipo;
