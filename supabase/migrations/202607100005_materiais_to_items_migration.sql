-- Migração de dados 100% aditiva: leva o catálogo por-tenant `materiais`
-- pro catálogo global `items`/`unidades` (já usado em Solicitações desde a
-- Fase 3). Não apaga `materiais` nem repontua `solicitacao_itens.material_id`
-- — histórico continua acessível, é uma depreciação suave.

insert into public.unidades (nome)
select distinct trim(m.unidade)
from public.materiais m
where m.unidade is not null and trim(m.unidade) <> ''
on conflict (lower(nome)) do nothing;

insert into public.items (nome, unidade_id)
select m.descricao, u.id
from public.materiais m
left join public.unidades u on lower(u.nome) = lower(trim(m.unidade))
where m.descricao is not null and trim(m.descricao) <> ''
on conflict (lower(nome)) do nothing;

update public.solicitacao_itens si
set item_id = i.id
from public.materiais m
join public.items i on lower(i.nome) = lower(m.descricao)
where si.material_id = m.id and si.item_id is null;

comment on table public.materiais is
  'DEPRECATED as of 202607100005 — superseded by items/unidades. Kept for historical solicitacao_itens.material_id references only.';
