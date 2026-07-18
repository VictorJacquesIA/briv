-- Regra de negócio: ao lançar mão de obra por diárias, o gestor_obra informa
-- só a quantidade de diárias — ele não sabe (e não deve arbitrar) o valor da
-- diária. Quem finaliza com os valores é compras/adm_geral, na confirmação
-- do pagamento (`confirmarLancamento`). Isso exige permitir valor/valor_diaria
-- nulos enquanto o lançamento está pendente, mas travando valor obrigatório
-- antes de confirmar.

alter table public.lancamentos_mo
  alter column valor drop not null;

alter table public.lancamentos_mo
  drop constraint if exists lancamentos_mo_valor_check;
alter table public.lancamentos_mo
  add constraint lancamentos_mo_valor_check
  check (valor is null or valor > 0);

alter table public.lancamentos_mo
  drop constraint if exists lancamentos_mo_diarias_check;
alter table public.lancamentos_mo
  add constraint lancamentos_mo_diarias_check
  check (
    (qtd_diarias is null and valor_diaria is null)
    or (
      qtd_diarias is not null
      and qtd_diarias > 0
      and (valor_diaria is null or valor_diaria > 0)
    )
  );

alter table public.lancamentos_mo
  add constraint lancamentos_mo_valor_or_diarias_check
  check (valor is not null or qtd_diarias is not null);

alter table public.lancamentos_mo
  add constraint lancamentos_mo_confirmado_tem_valor_check
  check (status = 'pendente' or (valor is not null and valor > 0));
