create extension if not exists "pgcrypto";

create type public.user_role as enum ('administrador', 'comprador', 'gestor');
create type public.solicitacao_status as enum (
  'rascunho',
  'aberta',
  'em_cotacao',
  'aprovacao',
  'aprovada',
  'rejeitada',
  'cancelada'
);
create type public.cotacao_status as enum (
  'rascunho',
  'enviada',
  'respondida',
  'vencida',
  'cancelada'
);
create type public.aprovacao_status as enum (
  'pendente',
  'aprovada',
  'rejeitada'
);
create type public.pedido_status as enum (
  'rascunho',
  'emitido',
  'enviado',
  'recebido',
  'cancelado'
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete restrict,
  nome text not null,
  role public.user_role not null default 'comprador',
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text not null,
  codigo text,
  endereco text,
  responsavel_id uuid references public.profiles(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, codigo)
);

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  email text,
  telefone text,
  contato text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, cnpj)
);

create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  codigo text,
  descricao text not null,
  unidade text not null,
  categoria text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, codigo)
);

create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete restrict,
  solicitante_id uuid not null references public.profiles(id) on delete restrict,
  status public.solicitacao_status not null default 'rascunho',
  observacao text,
  data_necessidade date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.solicitacao_itens (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  material_id uuid references public.materiais(id) on delete restrict,
  descricao text not null,
  unidade text not null,
  quantidade numeric(14, 4) not null check (quantidade > 0),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cotacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,
  status public.cotacao_status not null default 'rascunho',
  validade date,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (solicitacao_id, fornecedor_id)
);

create table public.cotacao_itens (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references public.cotacoes(id) on delete cascade,
  solicitacao_item_id uuid not null references public.solicitacao_itens(id) on delete cascade,
  preco_unitario numeric(14, 4),
  prazo_entrega_dias integer check (prazo_entrega_dias is null or prazo_entrega_dias >= 0),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cotacao_id, solicitacao_item_id)
);

create table public.aprovacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  aprovador_id uuid not null references public.profiles(id) on delete restrict,
  status public.aprovacao_status not null default 'pendente',
  comentario text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitacao_id uuid not null references public.solicitacoes(id) on delete restrict,
  fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,
  numero text,
  status public.pedido_status not null default 'rascunho',
  valor_total numeric(14, 2) not null default 0 check (valor_total >= 0),
  pdf_path text,
  emitido_por uuid references public.profiles(id) on delete set null,
  emitido_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, numero)
);

create table public.historico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entidade text not null,
  entidade_id uuid not null,
  acao text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from public.profiles where id = auth.uid() and ativo = true
$$;

create or replace function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and ativo = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'administrador', false)
$$;

create or replace function public.same_cliente(target_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_cliente_id = public.current_profile_cliente_id()
$$;

create trigger set_clientes_updated_at
before update on public.clientes
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_obras_updated_at
before update on public.obras
for each row execute function public.set_updated_at();

create trigger set_fornecedores_updated_at
before update on public.fornecedores
for each row execute function public.set_updated_at();

create trigger set_materiais_updated_at
before update on public.materiais
for each row execute function public.set_updated_at();

create trigger set_solicitacoes_updated_at
before update on public.solicitacoes
for each row execute function public.set_updated_at();

create trigger set_solicitacao_itens_updated_at
before update on public.solicitacao_itens
for each row execute function public.set_updated_at();

create trigger set_cotacoes_updated_at
before update on public.cotacoes
for each row execute function public.set_updated_at();

create trigger set_cotacao_itens_updated_at
before update on public.cotacao_itens
for each row execute function public.set_updated_at();

create trigger set_aprovacoes_updated_at
before update on public.aprovacoes
for each row execute function public.set_updated_at();

create trigger set_pedidos_updated_at
before update on public.pedidos
for each row execute function public.set_updated_at();

create index idx_profiles_cliente_id on public.profiles(cliente_id);
create index idx_obras_cliente_id on public.obras(cliente_id);
create index idx_fornecedores_cliente_id on public.fornecedores(cliente_id);
create index idx_materiais_cliente_id on public.materiais(cliente_id);
create index idx_solicitacoes_cliente_id on public.solicitacoes(cliente_id);
create index idx_solicitacoes_obra_id on public.solicitacoes(obra_id);
create index idx_solicitacao_itens_solicitacao_id on public.solicitacao_itens(solicitacao_id);
create index idx_cotacoes_cliente_id on public.cotacoes(cliente_id);
create index idx_cotacoes_solicitacao_id on public.cotacoes(solicitacao_id);
create index idx_cotacao_itens_cotacao_id on public.cotacao_itens(cotacao_id);
create index idx_aprovacoes_cliente_id on public.aprovacoes(cliente_id);
create index idx_pedidos_cliente_id on public.pedidos(cliente_id);
create index idx_historico_entidade on public.historico(entidade, entidade_id);

alter table public.clientes enable row level security;
alter table public.profiles enable row level security;
alter table public.obras enable row level security;
alter table public.fornecedores enable row level security;
alter table public.materiais enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.solicitacao_itens enable row level security;
alter table public.cotacoes enable row level security;
alter table public.cotacao_itens enable row level security;
alter table public.aprovacoes enable row level security;
alter table public.pedidos enable row level security;
alter table public.historico enable row level security;

create policy "clientes_select_same_tenant"
on public.clientes for select
using (id = public.current_profile_cliente_id() or public.is_admin());

create policy "clientes_admin_write"
on public.clientes for all
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_select_same_tenant"
on public.profiles for select
using (id = auth.uid() or public.same_cliente(cliente_id));

create policy "profiles_admin_write"
on public.profiles for all
using (public.is_admin() and public.same_cliente(cliente_id))
with check (public.is_admin() and public.same_cliente(cliente_id));

create policy "obras_tenant_select"
on public.obras for select
using (public.same_cliente(cliente_id));

create policy "obras_admin_write"
on public.obras for all
using (public.is_admin() and public.same_cliente(cliente_id))
with check (public.is_admin() and public.same_cliente(cliente_id));

create policy "fornecedores_tenant_select"
on public.fornecedores for select
using (public.same_cliente(cliente_id));

create policy "fornecedores_admin_comprador_write"
on public.fornecedores for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('administrador', 'comprador'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('administrador', 'comprador'));

create policy "materiais_tenant_select"
on public.materiais for select
using (public.same_cliente(cliente_id));

create policy "materiais_admin_comprador_write"
on public.materiais for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('administrador', 'comprador'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('administrador', 'comprador'));

create policy "solicitacoes_tenant_select"
on public.solicitacoes for select
using (public.same_cliente(cliente_id));

create policy "solicitacoes_tenant_insert"
on public.solicitacoes for insert
with check (public.same_cliente(cliente_id));

create policy "solicitacoes_owner_or_privileged_update"
on public.solicitacoes for update
using (
  public.same_cliente(cliente_id)
  and (solicitante_id = auth.uid() or public.current_profile_role() in ('administrador', 'comprador', 'gestor'))
)
with check (public.same_cliente(cliente_id));

create policy "solicitacao_itens_tenant_access"
on public.solicitacao_itens for all
using (
  exists (
    select 1 from public.solicitacoes s
    where s.id = solicitacao_id and public.same_cliente(s.cliente_id)
  )
)
with check (
  exists (
    select 1 from public.solicitacoes s
    where s.id = solicitacao_id and public.same_cliente(s.cliente_id)
  )
);

create policy "cotacoes_tenant_access"
on public.cotacoes for all
using (public.same_cliente(cliente_id))
with check (public.same_cliente(cliente_id));

create policy "cotacao_itens_tenant_access"
on public.cotacao_itens for all
using (
  exists (
    select 1 from public.cotacoes c
    where c.id = cotacao_id and public.same_cliente(c.cliente_id)
  )
)
with check (
  exists (
    select 1 from public.cotacoes c
    where c.id = cotacao_id and public.same_cliente(c.cliente_id)
  )
);

create policy "aprovacoes_tenant_select"
on public.aprovacoes for select
using (public.same_cliente(cliente_id));

create policy "aprovacoes_gestor_admin_write"
on public.aprovacoes for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('administrador', 'gestor'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('administrador', 'gestor'));

create policy "pedidos_tenant_access"
on public.pedidos for all
using (public.same_cliente(cliente_id))
with check (public.same_cliente(cliente_id));

create policy "historico_tenant_select"
on public.historico for select
using (public.same_cliente(cliente_id));

create policy "historico_system_insert"
on public.historico for insert
with check (public.same_cliente(cliente_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pedidos-pdf', 'pedidos-pdf', false, 10485760, array['application/pdf']),
  ('anexos', 'anexos', false, 52428800, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "storage_select_tenant_folder"
on storage.objects for select
using (
  bucket_id in ('pedidos-pdf', 'anexos')
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
);

create policy "storage_insert_tenant_folder"
on storage.objects for insert
with check (
  bucket_id in ('pedidos-pdf', 'anexos')
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
);

create policy "storage_update_tenant_folder"
on storage.objects for update
using (
  bucket_id in ('pedidos-pdf', 'anexos')
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
)
with check (
  bucket_id in ('pedidos-pdf', 'anexos')
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
);

create policy "storage_delete_tenant_folder_admin"
on storage.objects for delete
using (
  bucket_id in ('pedidos-pdf', 'anexos')
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
  and public.is_admin()
);
