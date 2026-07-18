-- Quem define o centro de custo (orcamento_item_id) de um lançamento de MO
-- passa a ser sempre compras/adm_geral — nunca o gestor_obra. Como o gestor
-- continua podendo lançar solicitação de mão de obra (aprovação implícita),
-- o centro de custo agora é preenchido só na confirmação do pagamento
-- (mesmo padrão já usado pro valor da diária em
-- 202607120002_lancamentos_mo_diaria_pendente.sql): obrigatório antes de
-- confirmar, opcional enquanto pendente.

alter table public.lancamentos_mo
  drop constraint if exists lancamentos_mo_solicitacao_requer_orcamento;
alter table public.lancamentos_mo
  add constraint lancamentos_mo_solicitacao_requer_orcamento
  check (
    tipo <> 'solicitacao'
    or status = 'pendente'
    or orcamento_item_id is not null
  );
