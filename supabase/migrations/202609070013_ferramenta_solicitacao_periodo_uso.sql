-- Tempo de uso que o gestor pretende ficar com a ferramenta — ajuda o
-- compras a decidir/negociar o tipo de locação (diária, semanal, mensal).
create type public.ferramenta_periodo_uso as enum ('diaria', 'semanal', 'mensal');

alter table public.ferramenta_solicitacoes
  add column if not exists periodo_uso public.ferramenta_periodo_uso;
