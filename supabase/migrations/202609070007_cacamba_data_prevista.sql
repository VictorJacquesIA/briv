-- Data que o gestor/adm define ao solicitar (ou ao pedir troca/devolução)
-- — usada pro lembrete automático de confirmação. Reaproveitada pra
-- qualquer ação pendente da caçamba (entrega, troca ou devolução), sempre
-- a data da AÇÃO ATUAL em aberto.
alter table public.cacambas
  add column if not exists data_prevista date;

alter table public.cacambas
  alter column status set default 'pendente';
