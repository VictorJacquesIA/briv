-- Fase de obra + orçamento por item + view de orçado x realizado (material).
-- O componente de MO da view fica em 0 até a Fase 6 (Pagamento MO) completar
-- com um `create or replace view`.

create type public.obra_fase as enum ('fase_1', 'fase_2', 'fase_3', 'concluida');

alter table public.obras
  add column if not exists fase public.obra_fase not null default 'fase_1';

create table if not exists public.obra_orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  descricao text not null,
  categoria text,
  valor_orcado numeric(14,2) not null check (valor_orcado >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_obra_orcamento_itens_obra_id on public.obra_orcamento_itens(obra_id);

drop trigger if exists set_obra_orcamento_itens_updated_at on public.obra_orcamento_itens;
create trigger set_obra_orcamento_itens_updated_at
before update on public.obra_orcamento_itens
for each row execute function public.set_updated_at();

alter table public.obra_orcamento_itens enable row level security;

drop policy if exists "obra_orcamento_itens_tenant_select" on public.obra_orcamento_itens;
create policy "obra_orcamento_itens_tenant_select"
on public.obra_orcamento_itens for select
using (public.same_cliente(cliente_id));

drop policy if exists "obra_orcamento_itens_admin_compras_write" on public.obra_orcamento_itens;
create policy "obra_orcamento_itens_admin_compras_write"
on public.obra_orcamento_itens for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

alter table public.solicitacao_itens
  add column if not exists orcamento_item_id uuid references public.obra_orcamento_itens(id) on delete set null;

-- Status em que o gasto de material já é considerado "realizado" (pós-aprovação
-- do dono da empresa). Mantido em sincronia com o fluxo de Compras (Fase 3).
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
  0::numeric(14,2) as mo_realizado
from public.obra_orcamento_itens oi
left join public.solicitacao_itens si on si.orcamento_item_id = oi.id
left join public.solicitacoes s on s.id = si.solicitacao_id
left join public.cotacoes cot on cot.solicitacao_id = s.id and cot.fornecedor_id = s.fornecedor_aprovado_id
left join public.cotacao_itens ci on ci.cotacao_id = cot.id and ci.solicitacao_item_id = si.id
group by oi.id, oi.obra_id, oi.cliente_id, oi.descricao, oi.categoria, oi.valor_orcado;
