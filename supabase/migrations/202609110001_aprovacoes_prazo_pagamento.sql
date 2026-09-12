-- Prazo de pagamento negociado na hora da autorização (ex: "30 dias",
-- "3x sem juros") — texto livre digitado por quem autoriza a compra
-- (aprovacao-decisao.tsx), visível pro adm_geral/compras no painel da
-- solicitação. Não entra no PDF do pedido, só informação interna.
alter table public.aprovacoes
  add column if not exists prazo_pagamento text;
