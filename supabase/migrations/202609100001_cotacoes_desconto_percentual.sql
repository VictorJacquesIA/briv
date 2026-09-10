-- Desconto (%) negociado com o fornecedor — aplicado proporcionalmente em
-- cada item na hora de salvar/validar a cotação (salvarCotacao/
-- validarCotacao), mas guardado aqui separado pra ficar rastreável depois
-- (o valor_total de cada cotacao_itens já sai com o desconto embutido).
alter table public.cotacoes
  add column if not exists desconto_percentual numeric(5,2)
    check (desconto_percentual is null or (desconto_percentual >= 0 and desconto_percentual <= 100));
