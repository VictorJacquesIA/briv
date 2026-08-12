-- Guarda o último PDF "pedir cotação" (gerarCotacaoRequestPdf) gerado pra
-- cada solicitação, pra não precisar gerar de novo toda vez que a página é
-- revisitada — o link (curto, via short_links) e a data ficam persistidos.
alter table public.solicitacoes
  add column if not exists cotacao_request_pdf_url text,
  add column if not exists cotacao_request_pdf_gerado_em timestamptz;
