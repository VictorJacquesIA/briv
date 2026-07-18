-- Indice para suportar o filtro de data do log de atividades (Home).
create index if not exists idx_historico_created_at on public.historico(created_at desc);
