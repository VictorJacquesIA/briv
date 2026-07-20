-- Ferramentas da empresa: controle individual (não por quantidade, como o
-- estoque de insumos) — cada ferramenta tem uma identidade e um status
-- atual (no depósito ou emprestada pra uma obra específica). Não reaproveita
-- estoque_itens/movimentacoes_estoque porque aquele modelo só soma
-- quantidade, sem localização por unidade.

create type public.ferramenta_status as enum ('deposito', 'emprestada');

create table public.ferramentas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text not null,
  codigo text,
  status public.ferramenta_status not null default 'deposito',
  obra_atual_id uuid references public.obras(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ferramentas_status_obra_consistente_check check (
    (status = 'deposito' and obra_atual_id is null)
    or (status = 'emprestada' and obra_atual_id is not null)
  )
);

create index idx_ferramentas_cliente_id on public.ferramentas(cliente_id);
create index idx_ferramentas_status on public.ferramentas(status);
create index idx_ferramentas_obra_atual_id on public.ferramentas(obra_atual_id);

create trigger set_ferramentas_updated_at
before update on public.ferramentas
for each row execute function public.set_updated_at();

alter table public.ferramentas enable row level security;

create policy "ferramentas_tenant_select"
on public.ferramentas for select
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

create policy "ferramentas_write"
on public.ferramentas for all
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

create type public.movimentacao_ferramenta_tipo as enum ('saida', 'entrada');

create table public.movimentacoes_ferramentas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  ferramenta_id uuid not null references public.ferramentas(id) on delete restrict,
  tipo public.movimentacao_ferramenta_tipo not null,
  -- obra_id é obrigatório nos dois tipos (diferente de movimentacoes_estoque):
  -- na saída é a obra de destino, na entrada é a obra de onde voltou —
  -- sempre existe uma, então vale registrar as duas pra auditoria completa.
  obra_id uuid not null references public.obras(id) on delete restrict,
  responsavel_id uuid references public.profiles(id) on delete set null,
  observacao text,
  created_at timestamptz not null default now()
);

create index idx_movimentacoes_ferramentas_cliente_id on public.movimentacoes_ferramentas(cliente_id);
create index idx_movimentacoes_ferramentas_ferramenta_id on public.movimentacoes_ferramentas(ferramenta_id);
create index idx_movimentacoes_ferramentas_obra_id on public.movimentacoes_ferramentas(obra_id);

alter table public.movimentacoes_ferramentas enable row level security;

create policy "movimentacoes_ferramentas_tenant_select"
on public.movimentacoes_ferramentas for select
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

-- Sem update/delete: histórico auditável e imutável, mesmo padrão de movimentacoes_estoque.
create policy "movimentacoes_ferramentas_insert"
on public.movimentacoes_ferramentas for insert
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox'));

-- Valida a regra de negócio (não empresta o que já está emprestado, não
-- devolve o que já está no depósito) e sincroniza ferramentas.status — tudo
-- num único BEFORE INSERT (diferente do trigger de contratos_mo, que
-- precisou de dois porque recalculava uma soma sobre várias linhas; aqui é
-- só um estado que muda a cada novo movimento, sem agregação).
-- NÃO precisa de security definer (diferente de contratos_mo): lá não
-- existia policy de UPDATE de propósito; aqui ferramentas_write (FOR ALL)
-- já libera update pro mesmo papel que insere o movimento, então o
-- SELECT ... FOR UPDATE do trigger passa pela própria policy do invocador.
create or replace function public.check_and_sync_ferramenta_movimentacao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status public.ferramenta_status;
begin
  select status into v_status from public.ferramentas where id = new.ferramenta_id for update;

  if v_status is null then
    raise exception 'Ferramenta não encontrada.';
  end if;

  if new.tipo = 'saida' and v_status = 'emprestada' then
    raise exception 'Esta ferramenta já está emprestada.';
  end if;

  if new.tipo = 'entrada' and v_status = 'deposito' then
    raise exception 'Esta ferramenta já está no depósito.';
  end if;

  update public.ferramentas
  set status = case when new.tipo = 'saida' then 'emprestada' else 'deposito' end,
      obra_atual_id = case when new.tipo = 'saida' then new.obra_id else null end
  where id = new.ferramenta_id;

  return new;
end;
$$;

create trigger trg_check_and_sync_ferramenta_movimentacao
before insert on public.movimentacoes_ferramentas
for each row execute function public.check_and_sync_ferramenta_movimentacao();
