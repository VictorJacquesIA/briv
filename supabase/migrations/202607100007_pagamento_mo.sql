-- Módulo Pagamento MO (mão de obra). Colaborador é cadastro simples, sem
-- login (mesmo padrão do "dono da empresa" — nunca é profile/auth.users).
-- "Realizado/Pago" da spec original NÃO é um 4º tipo de lançamento — é o
-- status='confirmado' sobre um lançamento tipo='solicitacao'.

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text not null,
  funcao text,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_colaboradores_cliente_id on public.colaboradores(cliente_id);

drop trigger if exists set_colaboradores_updated_at on public.colaboradores;
create trigger set_colaboradores_updated_at
before update on public.colaboradores
for each row execute function public.set_updated_at();

alter table public.colaboradores enable row level security;

drop policy if exists "colaboradores_tenant_select" on public.colaboradores;
create policy "colaboradores_tenant_select"
on public.colaboradores for select
using (public.same_cliente(cliente_id));

drop policy if exists "colaboradores_admin_compras_write" on public.colaboradores;
create policy "colaboradores_admin_compras_write"
on public.colaboradores for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

create type public.lancamento_mo_tipo as enum ('solicitacao', 'vale', 'reembolso');
create type public.lancamento_mo_status as enum ('pendente', 'confirmado');

create table if not exists public.lancamentos_mo (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete restrict,
  obra_id uuid not null references public.obras(id) on delete restrict,
  orcamento_item_id uuid references public.obra_orcamento_itens(id) on delete set null,
  tipo public.lancamento_mo_tipo not null,
  status public.lancamento_mo_status not null default 'pendente',
  valor numeric(14,2) not null check (valor > 0),
  descricao text,
  criado_por uuid references public.profiles(id) on delete set null,
  confirmado_por uuid references public.profiles(id) on delete set null,
  confirmado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lancamentos_mo_solicitacao_requer_orcamento
    check (tipo <> 'solicitacao' or orcamento_item_id is not null)
);

create index if not exists idx_lancamentos_mo_cliente_id on public.lancamentos_mo(cliente_id);
create index if not exists idx_lancamentos_mo_colaborador_id on public.lancamentos_mo(colaborador_id);
create index if not exists idx_lancamentos_mo_obra_id on public.lancamentos_mo(obra_id);

drop trigger if exists set_lancamentos_mo_updated_at on public.lancamentos_mo;
create trigger set_lancamentos_mo_updated_at
before update on public.lancamentos_mo
for each row execute function public.set_updated_at();

alter table public.lancamentos_mo enable row level security;

drop policy if exists "lancamentos_mo_tenant_select" on public.lancamentos_mo;
create policy "lancamentos_mo_tenant_select"
on public.lancamentos_mo for select
using (public.same_cliente(cliente_id));

-- adm_geral/compras lançam qualquer tipo; gestor_obra só "solicitacao" e só
-- em obra vinculada a ele (aprovação implícita, sem magic link).
drop policy if exists "lancamentos_mo_insert" on public.lancamentos_mo;
create policy "lancamentos_mo_insert"
on public.lancamentos_mo for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and tipo = 'solicitacao'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = lancamentos_mo.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);

-- Confirmar pagamento (mudar status) é exclusivo de adm_geral/compras.
drop policy if exists "lancamentos_mo_update_admin_compras" on public.lancamentos_mo;
create policy "lancamentos_mo_update_admin_compras"
on public.lancamentos_mo for update
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

-- Saldo corrente por colaborador: solicitacao+reembolso somam (empresa deve
-- ao colaborador), vale subtrai (adiantamento já pago). Separado em
-- confirmado (pago) vs pendente.
create or replace view public.v_colaborador_saldo
with (security_invoker = true) as
select
  c.id as colaborador_id,
  c.cliente_id,
  c.nome,
  coalesce(sum(case when l.status = 'confirmado' then
    case when l.tipo in ('solicitacao', 'reembolso') then l.valor
         when l.tipo = 'vale' then -l.valor
         else 0 end
  else 0 end), 0) as saldo_confirmado,
  coalesce(sum(case when l.status = 'pendente' then
    case when l.tipo in ('solicitacao', 'reembolso') then l.valor
         when l.tipo = 'vale' then -l.valor
         else 0 end
  else 0 end), 0) as saldo_pendente
from public.colaboradores c
left join public.lancamentos_mo l on l.colaborador_id = c.id
group by c.id, c.cliente_id, c.nome;
