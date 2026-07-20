-- Solicitações de serviço de obra abertas pelo gestor: caçamba de entulho
-- (com ciclo de vida — solicitada -> ativa -> encerrada, com pedidos de
-- troca/devolução enquanto ativa) e desmobilização (pedido pontual pra uma
-- data, sem ciclo de vida).

create type public.cacamba_status as enum ('solicitada', 'ativa', 'encerrada');
create type public.cacamba_acao_pendente as enum ('troca', 'devolucao');
create type public.cacamba_evento_tipo as enum ('entrega', 'pedido_troca', 'troca_confirmada', 'pedido_devolucao', 'devolucao_confirmada');

create table public.cacambas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete restrict,
  tipo text not null default 'mista',
  status public.cacamba_status not null default 'solicitada',
  acao_pendente public.cacamba_acao_pendente,
  observacao text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cacambas_acao_pendente_requer_ativa check (
    acao_pendente is null or status = 'ativa'
  )
);

create index idx_cacambas_cliente_id on public.cacambas(cliente_id);
create index idx_cacambas_obra_id on public.cacambas(obra_id);

create trigger set_cacambas_updated_at
before update on public.cacambas
for each row execute function public.set_updated_at();

alter table public.cacambas enable row level security;

create policy "cacambas_tenant_select"
on public.cacambas for select
using (public.same_cliente(cliente_id));

-- FOR ALL (não só insert): o trigger de cacamba_eventos faz um update
-- interno em nome de quem disparou o evento — gestor (pedido_troca/
-- pedido_devolucao) ou adm/compras (entrega/troca_confirmada/
-- devolucao_confirmada) — então a policy de update precisa cobrir os dois
-- lados, senão o "for update"/update do trigger falha sob RLS pra metade
-- dos casos (lição do trigger de ferramentas nesta mesma sessão).
create policy "cacambas_write"
on public.cacambas for all
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = cacambas.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
)
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = cacambas.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);

create table public.cacamba_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cacamba_id uuid not null references public.cacambas(id) on delete restrict,
  tipo public.cacamba_evento_tipo not null,
  observacao text,
  responsavel_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_cacamba_eventos_cliente_id on public.cacamba_eventos(cliente_id);
create index idx_cacamba_eventos_cacamba_id on public.cacamba_eventos(cacamba_id);

alter table public.cacamba_eventos enable row level security;

create policy "cacamba_eventos_tenant_select"
on public.cacamba_eventos for select
using (public.same_cliente(cliente_id));

-- Sem update/delete: histórico auditável e imutável, mesmo padrão de
-- movimentacoes_ferramentas/movimentacoes_estoque. Gestor só dispara os
-- tipos de "pedido" (nunca confirma), e só na obra vinculada a ele.
create policy "cacamba_eventos_insert"
on public.cacamba_eventos for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and tipo in ('pedido_troca', 'pedido_devolucao')
      and exists (
        select 1 from public.cacambas c
        join public.obra_usuarios ou on ou.obra_id = c.obra_id
        where c.id = cacamba_eventos.cacamba_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);

-- Valida a transição de estado e sincroniza cacambas.status/acao_pendente —
-- tudo num único BEFORE INSERT, sem security definer (a policy cacambas_write
-- já cobre todo mundo que pode disparar um evento). Todo CASE que escreve
-- numa coluna enum leva cast explícito (lição do bug do CASE em
-- check_and_sync_ferramenta_movimentacao nesta mesma sessão) e as checagens
-- de acao_pendente usam "is distinct from" em vez de "<>" pra tratar NULL
-- corretamente.
create or replace function public.check_and_sync_cacamba_evento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status public.cacamba_status;
  v_acao public.cacamba_acao_pendente;
begin
  select status, acao_pendente into v_status, v_acao
  from public.cacambas where id = new.cacamba_id for update;

  if v_status is null then
    raise exception 'Caçamba não encontrada.';
  end if;

  if new.tipo = 'entrega' and v_status is distinct from 'solicitada' then
    raise exception 'Esta caçamba já foi entregue.';
  end if;

  if new.tipo in ('pedido_troca', 'pedido_devolucao')
    and (v_status is distinct from 'ativa' or v_acao is not null)
  then
    raise exception 'Só é possível pedir troca ou devolução de uma caçamba ativa sem outra ação pendente.';
  end if;

  if new.tipo = 'troca_confirmada' and v_acao is distinct from 'troca' then
    raise exception 'Não há troca pendente para essa caçamba.';
  end if;

  if new.tipo = 'devolucao_confirmada' and v_acao is distinct from 'devolucao' then
    raise exception 'Não há devolução pendente para essa caçamba.';
  end if;

  update public.cacambas
  set
    status = case
      when new.tipo = 'entrega' then 'ativa'::public.cacamba_status
      when new.tipo = 'devolucao_confirmada' then 'encerrada'::public.cacamba_status
      else status
    end,
    acao_pendente = case
      when new.tipo = 'pedido_troca' then 'troca'::public.cacamba_acao_pendente
      when new.tipo = 'pedido_devolucao' then 'devolucao'::public.cacamba_acao_pendente
      when new.tipo in ('troca_confirmada', 'devolucao_confirmada') then null
      else acao_pendente
    end
  where id = new.cacamba_id;

  return new;
end;
$$;

create trigger trg_check_and_sync_cacamba_evento
before insert on public.cacamba_eventos
for each row execute function public.check_and_sync_cacamba_evento();

-- Desmobilização: pedido pontual, sem ciclo de vida — pendente -> concluída.
create type public.solicitacao_servico_status as enum ('pendente', 'concluida');

create table public.solicitacoes_desmobilizacao (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete restrict,
  data_desmobilizacao date not null,
  observacao text,
  status public.solicitacao_servico_status not null default 'pendente',
  criado_por uuid references public.profiles(id) on delete set null,
  concluido_por uuid references public.profiles(id) on delete set null,
  concluido_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_solicitacoes_desmobilizacao_cliente_id on public.solicitacoes_desmobilizacao(cliente_id);
create index idx_solicitacoes_desmobilizacao_obra_id on public.solicitacoes_desmobilizacao(obra_id);

create trigger set_solicitacoes_desmobilizacao_updated_at
before update on public.solicitacoes_desmobilizacao
for each row execute function public.set_updated_at();

alter table public.solicitacoes_desmobilizacao enable row level security;

create policy "solicitacoes_desmobilizacao_tenant_select"
on public.solicitacoes_desmobilizacao for select
using (public.same_cliente(cliente_id));

create policy "solicitacoes_desmobilizacao_insert"
on public.solicitacoes_desmobilizacao for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = solicitacoes_desmobilizacao.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);

-- Só adm/compras marcam como concluída.
create policy "solicitacoes_desmobilizacao_update_admin_compras"
on public.solicitacoes_desmobilizacao for update
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));
