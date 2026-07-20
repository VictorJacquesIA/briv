-- Contrato de mão de obra: valor fechado combinado com um prestador de
-- serviço pra uma obra, pago à vista ou em parcelas. Uma parcela é só um
-- lancamentos_mo comum (tipo='solicitacao') marcado com contrato_id — reusa
-- toda a infra de confirmação/RLS/apuração de orçamento já existente em vez
-- de duplicar em uma tabela de pagamentos separada.

create type public.contrato_mo_status as enum ('aberto', 'quitado');

create table public.contratos_mo (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete restrict,
  colaborador_id uuid not null references public.colaboradores(id) on delete restrict,
  descricao text not null,
  valor_total numeric(14,2) not null check (valor_total > 0),
  status public.contrato_mo_status not null default 'aberto',
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contratos_mo_cliente_id on public.contratos_mo(cliente_id);
create index idx_contratos_mo_obra_id on public.contratos_mo(obra_id);
create index idx_contratos_mo_colaborador_id on public.contratos_mo(colaborador_id);

create trigger set_contratos_mo_updated_at
before update on public.contratos_mo
for each row execute function public.set_updated_at();

alter table public.contratos_mo enable row level security;

create policy "contratos_mo_tenant_select"
on public.contratos_mo for select
using (public.same_cliente(cliente_id));

-- Espelha lancamentos_mo_insert: adm_geral/compras sempre; gestor_obra só na
-- obra vinculada a ele via obra_usuarios. Sem policy de update/delete — o
-- status só muda via trigger security definer (sync_contrato_mo_status) e
-- editar valor_total/descricao depois de criado fica fora do escopo.
create policy "contratos_mo_insert"
on public.contratos_mo for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = contratos_mo.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);

-- Parcela de contrato é sempre um lançamento tipo='solicitacao' de valor
-- fechado — nunca por diárias (o valor precisa ser conhecido no insert pra
-- travar o saldo do contrato; diária deferida pra confirmação quebraria essa
-- checagem, já que sum() ignora null e a parcela reservaria zero à toa).
alter table public.lancamentos_mo
  add column contrato_id uuid references public.contratos_mo(id) on delete restrict;

create index idx_lancamentos_mo_contrato_id on public.lancamentos_mo(contrato_id);

alter table public.lancamentos_mo
  add constraint lancamentos_mo_contrato_requer_solicitacao_check
  check (
    contrato_id is null
    or (tipo = 'solicitacao' and qtd_diarias is null and valor_diaria is null and valor is not null)
  );

-- BEFORE: recusa a parcela se estourar o saldo do contrato ou se o contrato
-- já estiver quitado. Trava a linha do contrato (for update) pra serializar
-- parcelas concorrentes no mesmo contrato_id e fechar a corrida de
-- "checar soma, depois inserir". security definer porque SELECT ... FOR
-- UPDATE sob RLS exige uma policy de UPDATE pra funcionar, e contratos_mo
-- propositalmente não tem uma (só o trigger de sync deve escrever o status).
create or replace function public.check_contrato_mo_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor_total numeric(14,2);
  v_status public.contrato_mo_status;
  v_comprometido numeric(14,2);
begin
  if new.contrato_id is null then
    return new;
  end if;

  select valor_total, status into v_valor_total, v_status
  from public.contratos_mo
  where id = new.contrato_id
  for update;

  if v_valor_total is null then
    raise exception 'Contrato de mão de obra não encontrado.';
  end if;

  if v_status = 'quitado' then
    raise exception 'Este contrato já está quitado.';
  end if;

  select coalesce(sum(valor), 0) into v_comprometido
  from public.lancamentos_mo
  where contrato_id = new.contrato_id
    and status in ('pendente', 'confirmado')
    and id <> new.id;

  if v_comprometido + new.valor > v_valor_total then
    raise exception 'Valor da parcela excede o saldo restante do contrato.';
  end if;

  return new;
end;
$$;

create trigger trg_check_contrato_mo_saldo
before insert or update of valor, contrato_id, status on public.lancamentos_mo
for each row
when (new.contrato_id is not null)
execute function public.check_contrato_mo_saldo();

-- AFTER: recalcula e grava contratos_mo.status. security definer porque não
-- existe policy de update client-side em contratos_mo.
create or replace function public.sync_contrato_mo_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrato_id uuid := coalesce(new.contrato_id, old.contrato_id);
  v_valor_total numeric(14,2);
  v_confirmado numeric(14,2);
  v_novo_status public.contrato_mo_status;
begin
  if v_contrato_id is null then
    return coalesce(new, old);
  end if;

  select valor_total into v_valor_total from public.contratos_mo where id = v_contrato_id;

  select coalesce(sum(valor), 0) into v_confirmado
  from public.lancamentos_mo
  where contrato_id = v_contrato_id and status = 'confirmado';

  v_novo_status := case when v_confirmado >= v_valor_total then 'quitado' else 'aberto' end;

  update public.contratos_mo
  set status = v_novo_status
  where id = v_contrato_id and status <> v_novo_status;

  return coalesce(new, old);
end;
$$;

-- Duas triggers porque o WHEN de uma trigger de INSERT não pode referenciar
-- OLD (não existe pra essa operação) — UPDATE referencia OLD pra cobrir o
-- caso raro de contrato_id ser desvinculado.
create trigger trg_sync_contrato_mo_status_insert
after insert on public.lancamentos_mo
for each row
when (new.contrato_id is not null)
execute function public.sync_contrato_mo_status();

create trigger trg_sync_contrato_mo_status_update
after update of status, valor, contrato_id on public.lancamentos_mo
for each row
when (coalesce(new.contrato_id, old.contrato_id) is not null)
execute function public.sync_contrato_mo_status();

-- Saldo por contrato, mesmo estilo de v_colaborador_saldo.
create or replace view public.v_contrato_mo_saldo
with (security_invoker = true) as
select
  c.id as contrato_id,
  c.cliente_id,
  c.obra_id,
  o.nome as obra_nome,
  c.colaborador_id,
  col.nome as colaborador_nome,
  c.descricao,
  c.valor_total,
  c.status,
  c.created_at,
  coalesce(sum(case when l.status = 'confirmado' then l.valor else 0 end), 0) as valor_confirmado,
  coalesce(sum(case when l.status = 'pendente' then l.valor else 0 end), 0) as valor_pendente,
  c.valor_total - coalesce(sum(case when l.status in ('pendente', 'confirmado') then l.valor else 0 end), 0) as saldo_restante
from public.contratos_mo c
join public.obras o on o.id = c.obra_id
join public.colaboradores col on col.id = c.colaborador_id
left join public.lancamentos_mo l on l.contrato_id = c.id
group by c.id, c.cliente_id, c.obra_id, o.nome, c.colaborador_id, col.nome, c.descricao, c.valor_total, c.status, c.created_at;
