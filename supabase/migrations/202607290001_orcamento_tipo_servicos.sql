-- Novo tipo de centro de custo pra serviços de obra (caçamba, desmobilização
-- etc.) — mesmo padrão de insumos/mão de obra. Em migration separada porque
-- Postgres não deixa usar um valor de enum recém-adicionado na mesma
-- transação em que ele foi criado.
alter type public.obra_orcamento_tipo add value if not exists 'servicos';
