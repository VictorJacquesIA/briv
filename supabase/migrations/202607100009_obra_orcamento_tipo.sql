-- Separa o orçamento da obra em Insumos (material) vs Mão de Obra — cada um
-- com seu próprio valor_orcado, em vez de disputar o mesmo valor. Triggers
-- garantem que uma solicitação de material só linka em item tipo='insumos'
-- e um lançamento de MO só linka em item tipo='mao_de_obra' — não depende
-- de nomear certo, o banco recusa a combinação errada.

create type public.obra_orcamento_tipo as enum ('insumos', 'mao_de_obra');

alter table public.obra_orcamento_itens
  add column if not exists tipo public.obra_orcamento_tipo;

-- Backfill: linhas existentes com "mo"/"mão de obra" na descrição viram
-- mao_de_obra, o resto vira insumos (default razoável pro que já existia).
update public.obra_orcamento_itens
set tipo = 'mao_de_obra'
where tipo is null and (descricao ilike '%mão de obra%' or descricao ilike '%mao de obra%' or descricao ilike '%-mo%' or descricao ilike '% mo' or descricao ilike '% mo%');

update public.obra_orcamento_itens
set tipo = 'insumos'
where tipo is null;

alter table public.obra_orcamento_itens
  alter column tipo set default 'insumos',
  alter column tipo set not null;

create or replace function public.check_solicitacao_item_orcamento_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.orcamento_item_id is not null then
    if not exists (
      select 1 from public.obra_orcamento_itens oi
      where oi.id = new.orcamento_item_id and oi.tipo = 'insumos'
    ) then
      raise exception 'Item de orçamento selecionado não é do tipo Insumos.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_solicitacao_item_orcamento_tipo on public.solicitacao_itens;
create trigger trg_solicitacao_item_orcamento_tipo
before insert or update of orcamento_item_id on public.solicitacao_itens
for each row execute function public.check_solicitacao_item_orcamento_tipo();

create or replace function public.check_lancamento_mo_orcamento_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.orcamento_item_id is not null then
    if not exists (
      select 1 from public.obra_orcamento_itens oi
      where oi.id = new.orcamento_item_id and oi.tipo = 'mao_de_obra'
    ) then
      raise exception 'Item de orçamento selecionado não é do tipo Mão de Obra.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lancamento_mo_orcamento_tipo on public.lancamentos_mo;
create trigger trg_lancamento_mo_orcamento_tipo
before insert or update of orcamento_item_id on public.lancamentos_mo
for each row execute function public.check_lancamento_mo_orcamento_tipo();

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
  oi.tipo
from public.obra_orcamento_itens oi
left join public.solicitacao_itens si on si.orcamento_item_id = oi.id
left join public.solicitacoes s on s.id = si.solicitacao_id
left join public.cotacoes cot on cot.solicitacao_id = s.id and cot.fornecedor_id = s.fornecedor_aprovado_id
left join public.cotacao_itens ci on ci.cotacao_id = cot.id and ci.solicitacao_item_id = si.id
group by oi.id, oi.obra_id, oi.cliente_id, oi.descricao, oi.categoria, oi.valor_orcado, oi.tipo;
