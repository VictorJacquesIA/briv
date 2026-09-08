-- Controla se a mensagem de solicitação/troca já foi enviada pro
-- fornecedor pelo WhatsApp — confirmar entrega/troca fica bloqueado até
-- isso acontecer, pra não confirmar uma caçamba que o fornecedor nem sabe
-- que precisa entregar/trocar.
alter table public.cacambas
  add column if not exists mensagem_enviada_em timestamptz;
