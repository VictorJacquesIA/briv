-- Suporta aprovação dividida entre fornecedores diferentes: cada item da
-- solicitação passa a guardar QUEM foi aprovado para ele, em vez de depender
-- só do fornecedor único da solicitação inteira.
alter table public.solicitacao_itens
  add column if not exists fornecedor_aprovado_id uuid references public.fornecedores(id) on delete set null;

-- v_obra_orcamento_realizado somava o material realizado juntando pela
-- solicitação inteira (s.fornecedor_aprovado_id). Com aprovação dividida,
-- isso perderia o valor dos itens que foram para outros fornecedores. Passa
-- a juntar por item (si.fornecedor_aprovado_id), que é preenchido para TODOS
-- os itens (divididos ou não), então o comportamento pra pedidos com um só
-- fornecedor continua idêntico.
create or replace view public.v_obra_orcamento_realizado
with (security_invoker = true) as
select
  oi.id as orcamento_item_id,
  oi.obra_id,
  oi.cliente_id,
  oi.descricao,
  oi.categoria,
  oi.valor_orcado,
  coalesce(sum(ci.valor_total) filter (
    where s.status in ('pdf_gerado', 'pedido_programado', 'pedido_enviado', 'finalizada')
  ), 0) as material_realizado,
  coalesce((
    select sum(l.valor)
    from public.lancamentos_mo l
    where l.orcamento_item_id = oi.id and l.status = 'confirmado' and l.tipo = 'solicitacao'
  ), 0)::numeric(14,2) as mo_realizado,
  oi.tipo,
  coalesce((
    select sum(c.valor)
    from public.cacambas c
    where c.orcamento_item_id = oi.id
  ), 0)::numeric(14,2) as servicos_realizado,
  coalesce((
    select sum(d.valor)
    from public.despesas_manuais d
    where d.orcamento_item_id = oi.id
  ), 0)::numeric(14,2) as despesas_realizado
from public.obra_orcamento_itens oi
left join public.solicitacao_itens si on si.orcamento_item_id = oi.id
left join public.solicitacoes s on s.id = si.solicitacao_id
left join public.cotacoes cot on cot.solicitacao_id = s.id and cot.fornecedor_id = si.fornecedor_aprovado_id
left join public.cotacao_itens ci on ci.cotacao_id = cot.id and ci.solicitacao_item_id = si.id
group by oi.id, oi.obra_id, oi.cliente_id, oi.descricao, oi.categoria, oi.valor_orcado, oi.tipo;
