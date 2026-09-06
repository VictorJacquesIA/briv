-- Guarda o caminho exato do arquivo no Storage (bucket "anexos") do PDF de
-- pedir cotação, separado do link curto (cotacao_request_pdf_url) — é o que
-- a limpeza automática (app/api/cron/cleanup-pdfs) usa pra apagar o arquivo
-- certo depois de 90 dias, sem precisar re-parsear a URL curta.
alter table public.solicitacoes
  add column if not exists cotacao_request_pdf_path text;
