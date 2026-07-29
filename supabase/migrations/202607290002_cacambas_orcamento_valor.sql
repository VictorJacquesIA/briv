-- Caçambas passam a poder ser vinculadas a um centro de custo (item de
-- orçamento da obra, tipo 'servicos') e ter um valor — mesmo padrão de
-- insumos/mão de obra: um trigger garante que só item desse tipo pode ser
-- escolhido, e a view de orçamento realizado ganha uma coluna
-- servicos_realizado somando o valor das caçambas vinculadas.
alter table public.cacambas
  add column if not exists orcamento_item_id uuid references public.obra_orcamento_itens(id) on delete set null,
  add column if not exists valor numeric(14, 2);

create or replace function public.check_cacamba_orcamento_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.orcamento_item_id is not null then
    if not exists (
      select 1 from public.obra_orcamento_itens oi
      where oi.id = new.orcamento_item_id and oi.tipo = 'servicos'
    ) then
      raise exception 'Item de orçamento selecionado não é do tipo Serviços.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cacamba_orcamento_tipo on public.cacambas;
create trigger trg_cacamba_orcamento_tipo
before insert or update of orcamento_item_id on public.cacambas
for each row execute function public.check_cacamba_orcamento_tipo();

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
  ), 0)::numeric(14,2) as servicos_realizado
from public.obra_orcamento_itens oi
left join public.solicitacao_itens si on si.orcamento_item_id = oi.id
left join public.solicitacoes s on s.id = si.solicitacao_id
left join public.cotacoes cot on cot.solicitacao_id = s.id and cot.fornecedor_id = s.fornecedor_aprovado_id
left join public.cotacao_itens ci on ci.cotacao_id = cot.id and ci.solicitacao_item_id = si.id
group by oi.id, oi.obra_id, oi.cliente_id, oi.descricao, oi.categoria, oi.valor_orcado, oi.tipo;
