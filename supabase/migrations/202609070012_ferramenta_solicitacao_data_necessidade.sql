-- Data que o gestor precisa da ferramenta — informada já na solicitação,
-- separada de data_prevista_devolucao (que é sobre quando uma locação
-- termina, só existe depois que o compras decide locar).
alter table public.ferramenta_solicitacoes
  add column if not exists data_necessidade date;
