-- Novo estágio inicial: a solicitação entra "pendente" até o compras
-- enviar a mensagem pro fornecedor (aí vira "solicitada", aguardando a
-- entrega na data prevista).
alter type public.cacamba_status add value if not exists 'pendente';
