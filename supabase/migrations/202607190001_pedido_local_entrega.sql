-- Forma de chegada do pedido (obra, retirada autorizada ou depósito) e
-- confirmação de recebimento. "retirada" não tem destino fixo: só define quem
-- está autorizado a buscar; o destino final (obra ou depósito) só é decidido
-- na confirmação de recebimento, junto com o efeito no estoque.
create type public.pedido_local_entrega as enum ('obra', 'deposito', 'retirada');

alter table public.pedidos
  add column local_entrega public.pedido_local_entrega,
  add column retirada_autorizado_nome text,
  add column retirada_autorizado_documento text,
  add column retirada_destino_final public.pedido_local_entrega,
  add column recebido_em timestamptz,
  add column recebido_por uuid references public.profiles(id) on delete set null;
