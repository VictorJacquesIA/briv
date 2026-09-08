-- Rastreia o fornecedor escolhido e o envio da mensagem de WhatsApp já na
-- solicitação, antes de a ferramenta locada existir — permite mandar a
-- mensagem pro fornecedor com o pedido antes de confirmar os termos/entrega.
alter table public.ferramenta_solicitacoes
  add column if not exists fornecedor_id uuid references public.fornecedores(id) on delete set null,
  add column if not exists mensagem_enviada_em timestamptz;
