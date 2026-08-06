-- pedidos só tinha índice em cliente_id; faltavam os FKs usados no join de
-- getSolicitacaoDetail (pedidos + fornecedor), forçando sequential scan.
create index if not exists idx_pedidos_solicitacao_id on public.pedidos(solicitacao_id);
create index if not exists idx_pedidos_fornecedor_id on public.pedidos(fornecedor_id);
