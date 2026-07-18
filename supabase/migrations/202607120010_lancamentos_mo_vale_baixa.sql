-- Vale (adiantamento) precisa ficar vinculado e visível pro compras/adm dar
-- baixa contra um pagamento (solicitação/reembolso) do mesmo colaborador —
-- hoje um vale só entra no saldo agregado (v_colaborador_saldo), sem
-- nenhum jeito de marcar "esse adiantamento já foi descontado desse
-- pagamento". vale_aplicado_em aponta pro lançamento (solicitacao/
-- reembolso) contra o qual o vale foi baixado; null = ainda em aberto.

alter table public.lancamentos_mo
  add column if not exists vale_aplicado_em uuid references public.lancamentos_mo(id) on delete set null;

alter table public.lancamentos_mo
  drop constraint if exists lancamentos_mo_vale_aplicado_em_check;
alter table public.lancamentos_mo
  add constraint lancamentos_mo_vale_aplicado_em_check
  check (vale_aplicado_em is null or tipo = 'vale');

create index if not exists idx_lancamentos_mo_vale_aplicado_em on public.lancamentos_mo(vale_aplicado_em);
