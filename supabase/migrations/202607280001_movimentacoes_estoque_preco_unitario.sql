-- Valor unitário pago no insumo, registrado manualmente numa entrada de
-- estoque que não passou por cotação (ex.: compra avulsa, doação, sobra
-- comprada direto no fornecedor). Fica nulo quando a entrada não informa
-- valor (ex.: devolução de sobra de obra já paga anteriormente).
alter table public.movimentacoes_estoque
  add column preco_unitario numeric(14, 2);
