-- Toda saída de estoque precisa saber pra qual obra o insumo foi —
-- inclusive a retirada manual avulsa (registrarSaidaEstoque), que até
-- agora não vinculava obra nenhuma. Entrada não exige (material chegando
-- no depósito, sem destino ainda).

alter table public.movimentacoes_estoque
  add column if not exists obra_id uuid references public.obras(id) on delete restrict;

alter table public.movimentacoes_estoque
  drop constraint if exists movimentacoes_estoque_saida_requer_obra;
alter table public.movimentacoes_estoque
  add constraint movimentacoes_estoque_saida_requer_obra
  check (tipo <> 'saida' or obra_id is not null);

create index if not exists idx_movimentacoes_estoque_obra_id on public.movimentacoes_estoque(obra_id);
