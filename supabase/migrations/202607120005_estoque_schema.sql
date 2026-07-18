-- Módulo de Estoque: depósito único por empresa (cliente_id), reaproveita o
-- catálogo global items/unidades (não duplica cadastro de nome/unidade).
-- Saldo é sempre calculado via view sobre movimentacoes_estoque (mesmo
-- padrão de v_colaborador_saldo em 202607100007_pagamento_mo.sql) — nunca
-- uma coluna de quantidade escrita diretamente, pra não haver drift entre
-- "quantidade" e o histórico de movimentações.

create table if not exists public.estoque_itens (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  quantidade_minima numeric(14, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, item_id)
);

create index if not exists idx_estoque_itens_cliente_id on public.estoque_itens(cliente_id);
create index if not exists idx_estoque_itens_item_id on public.estoque_itens(item_id);

drop trigger if exists set_estoque_itens_updated_at on public.estoque_itens;
create trigger set_estoque_itens_updated_at
before update on public.estoque_itens
for each row execute function public.set_updated_at();

alter table public.estoque_itens enable row level security;

drop policy if exists "estoque_itens_tenant_select" on public.estoque_itens;
create policy "estoque_itens_tenant_select"
on public.estoque_itens for select
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

drop policy if exists "estoque_itens_write" on public.estoque_itens;
create policy "estoque_itens_write"
on public.estoque_itens for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

create type public.movimentacao_estoque_tipo as enum ('entrada', 'saida');

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  estoque_item_id uuid not null references public.estoque_itens(id) on delete restrict,
  tipo public.movimentacao_estoque_tipo not null,
  quantidade numeric(14, 4) not null check (quantidade > 0),
  motivo text,
  solicitacao_id uuid references public.solicitacoes(id) on delete set null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_movimentacoes_estoque_cliente_id on public.movimentacoes_estoque(cliente_id);
create index if not exists idx_movimentacoes_estoque_estoque_item_id on public.movimentacoes_estoque(estoque_item_id);
create index if not exists idx_movimentacoes_estoque_solicitacao_id on public.movimentacoes_estoque(solicitacao_id);

alter table public.movimentacoes_estoque enable row level security;

drop policy if exists "movimentacoes_estoque_tenant_select" on public.movimentacoes_estoque;
create policy "movimentacoes_estoque_tenant_select"
on public.movimentacoes_estoque for select
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

-- Sem update/delete: histórico auditável e imutável, mesmo padrão de
-- `historico` (prevent_historico_update/delete). Insert liberado pros 3
-- papéis do módulo — a aplicação decide quando é 'entrada' (tela de nova
-- entrada) vs 'saida' (só via confirmarSeparacao).
drop policy if exists "movimentacoes_estoque_insert" on public.movimentacoes_estoque;
create policy "movimentacoes_estoque_insert"
on public.movimentacoes_estoque for insert
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

create or replace view public.v_estoque_saldo
with (security_invoker = true) as
select
  ei.id as estoque_item_id,
  ei.cliente_id,
  ei.item_id,
  i.nome as item_nome,
  u.nome as unidade_nome,
  ei.quantidade_minima,
  coalesce(sum(case
    when m.tipo = 'entrada' then m.quantidade
    when m.tipo = 'saida' then -m.quantidade
    else 0
  end), 0) as quantidade_atual
from public.estoque_itens ei
join public.items i on i.id = ei.item_id
left join public.unidades u on u.id = i.unidade_id
left join public.movimentacoes_estoque m on m.estoque_item_id = ei.id
group by ei.id, ei.cliente_id, ei.item_id, i.nome, u.nome, ei.quantidade_minima;

create type public.requisicao_almox_status as enum ('pendente', 'separado');

create table if not exists public.requisicoes_almox (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete restrict,
  status public.requisicao_almox_status not null default 'pendente',
  criado_por uuid references public.profiles(id) on delete set null,
  separado_por uuid references public.profiles(id) on delete set null,
  separado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_requisicoes_almox_cliente_id on public.requisicoes_almox(cliente_id);
create index if not exists idx_requisicoes_almox_solicitacao_id on public.requisicoes_almox(solicitacao_id);
create index if not exists idx_requisicoes_almox_status on public.requisicoes_almox(status);

drop trigger if exists set_requisicoes_almox_updated_at on public.requisicoes_almox;
create trigger set_requisicoes_almox_updated_at
before update on public.requisicoes_almox
for each row execute function public.set_updated_at();

alter table public.requisicoes_almox enable row level security;

drop policy if exists "requisicoes_almox_tenant_select" on public.requisicoes_almox;
create policy "requisicoes_almox_tenant_select"
on public.requisicoes_almox for select
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

-- Gerada só pela decisão do Compras (decidirEstoqueSolicitacao).
drop policy if exists "requisicoes_almox_insert_compras" on public.requisicoes_almox;
create policy "requisicoes_almox_insert_compras"
on public.requisicoes_almox for insert
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

-- Só o Almox (ou adm_geral) marca como separado.
drop policy if exists "requisicoes_almox_update_almox" on public.requisicoes_almox;
create policy "requisicoes_almox_update_almox"
on public.requisicoes_almox for update
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'almox'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'almox'));

create table if not exists public.requisicao_almox_itens (
  id uuid primary key default gen_random_uuid(),
  requisicao_id uuid not null references public.requisicoes_almox(id) on delete cascade,
  solicitacao_item_id uuid not null references public.solicitacao_itens(id) on delete restrict,
  estoque_item_id uuid not null references public.estoque_itens(id) on delete restrict,
  quantidade_solicitada numeric(14, 4) not null check (quantidade_solicitada > 0),
  quantidade_separada numeric(14, 4),
  created_at timestamptz not null default now()
);

create index if not exists idx_requisicao_almox_itens_requisicao_id on public.requisicao_almox_itens(requisicao_id);

alter table public.requisicao_almox_itens enable row level security;

drop policy if exists "requisicao_almox_itens_select" on public.requisicao_almox_itens;
create policy "requisicao_almox_itens_select"
on public.requisicao_almox_itens for select
using (
  exists (
    select 1 from public.requisicoes_almox r
    where r.id = requisicao_id
      and public.same_cliente(r.cliente_id)
      and public.current_profile_role() in ('adm_geral', 'compras', 'almox')
  )
);

drop policy if exists "requisicao_almox_itens_insert_compras" on public.requisicao_almox_itens;
create policy "requisicao_almox_itens_insert_compras"
on public.requisicao_almox_itens for insert
with check (
  exists (
    select 1 from public.requisicoes_almox r
    where r.id = requisicao_id
      and public.same_cliente(r.cliente_id)
      and public.current_profile_role() in ('adm_geral', 'compras')
  )
);

drop policy if exists "requisicao_almox_itens_update_almox" on public.requisicao_almox_itens;
create policy "requisicao_almox_itens_update_almox"
on public.requisicao_almox_itens for update
using (
  exists (
    select 1 from public.requisicoes_almox r
    where r.id = requisicao_id
      and public.same_cliente(r.cliente_id)
      and public.current_profile_role() in ('adm_geral', 'almox')
  )
)
with check (
  exists (
    select 1 from public.requisicoes_almox r
    where r.id = requisicao_id
      and public.same_cliente(r.cliente_id)
      and public.current_profile_role() in ('adm_geral', 'almox')
  )
);

-- solicitacoes.estoque_decidido_at: marca que o Compras já passou pela
-- decisão item a item (estoque x cotação) — controla o gate do botão
-- "Iniciar cotação". solicitacoes.divergencia_estoque_at: sinaliza que o
-- Almox reportou menos quantidade física do que o prometido, pro Compras
-- decidir manualmente o ajuste na cotação.
alter table public.solicitacoes
  add column if not exists estoque_decidido_at timestamptz,
  add column if not exists divergencia_estoque_at timestamptz;

-- solicitacao_itens.quantidade_estoque: quanto do item foi destinado ao
-- estoque (o restante, quantidade - quantidade_estoque, vai pra cotação).
alter table public.solicitacao_itens
  add column if not exists quantidade_estoque numeric(14, 4) not null default 0;

alter table public.solicitacao_itens
  drop constraint if exists solicitacao_itens_quantidade_estoque_check;
alter table public.solicitacao_itens
  add constraint solicitacao_itens_quantidade_estoque_check
  check (quantidade_estoque >= 0 and quantidade_estoque <= quantidade);
