-- Solicitação de ferramenta feita pelo gestor de obra — fica pendente até
-- o compras decidir se manda uma do depósito ou loca de um fornecedor.
create type public.ferramenta_solicitacao_status as enum ('pendente', 'atendida', 'cancelada');
create type public.ferramenta_solicitacao_decisao as enum ('deposito', 'locacao');

create table public.ferramenta_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete restrict,
  descricao text not null,
  observacao text,
  status public.ferramenta_solicitacao_status not null default 'pendente',
  decisao public.ferramenta_solicitacao_decisao,
  ferramenta_id uuid references public.ferramentas(id) on delete set null,
  solicitado_por uuid references public.profiles(id) on delete set null,
  atendido_por uuid references public.profiles(id) on delete set null,
  atendido_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ferramenta_solicitacoes_cliente_id on public.ferramenta_solicitacoes(cliente_id);
create index idx_ferramenta_solicitacoes_obra_id on public.ferramenta_solicitacoes(obra_id);
create index idx_ferramenta_solicitacoes_status on public.ferramenta_solicitacoes(status);

create trigger set_ferramenta_solicitacoes_updated_at
before update on public.ferramenta_solicitacoes
for each row execute function public.set_updated_at();

alter table public.ferramenta_solicitacoes enable row level security;

create policy "ferramenta_solicitacoes_tenant_select"
on public.ferramenta_solicitacoes for select
using (public.same_cliente(cliente_id));

-- Gestor de obra e compras/adm podem abrir solicitação; a checagem de "é a
-- obra dele mesmo" (gestor) é feita na aplicação, igual caçamba/desmobilização.
create policy "ferramenta_solicitacoes_insert"
on public.ferramenta_solicitacoes for insert
with check (
  public.same_cliente(cliente_id)
  and public.current_profile_role() in ('adm_geral', 'compras', 'gestor_obra')
);

-- Decidir (depósito/locação) e confirmar entrega/devolução é só compras/adm.
create policy "ferramenta_solicitacoes_update"
on public.ferramenta_solicitacoes for update
using (
  public.same_cliente(cliente_id)
  and public.current_profile_role() in ('adm_geral', 'compras')
)
with check (
  public.same_cliente(cliente_id)
  and public.current_profile_role() in ('adm_geral', 'compras')
);
