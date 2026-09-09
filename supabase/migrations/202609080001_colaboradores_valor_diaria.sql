-- Valor de diária padrão do colaborador/prestador — campo opcional, só
-- informativo/cadastral (não afeta cálculo de lançamentos automaticamente,
-- que continua usando o valor_diaria digitado em cada lançamento).
alter table public.colaboradores
  add column if not exists valor_diaria numeric(10,2) check (valor_diaria is null or valor_diaria > 0);
