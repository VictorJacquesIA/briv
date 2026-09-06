-- Terceiro tipo de item de orçamento pra gastos que não são Insumo nem Mão
-- de Obra (seguro, ART, coordenador, impostos, etc. — vistos em relatórios
-- de obra externos como categorias "administrativas" à parte). Só entra
-- via despesas_manuais (nenhuma solicitação/cotação ou lançamento de MO
-- linka em item tipo 'extra' — os triggers de check_*_orcamento_tipo já
-- restringem a 'insumos'/'mao_de_obra' respectivamente, então não corre o
-- risco de um novo tipo vazar pra lugar errado).
alter type public.obra_orcamento_tipo add value if not exists 'extra';
