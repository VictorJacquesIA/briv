-- Nova frente: ferramenta locada de fornecedor externo (além de depósito/emprestada).
-- Nasce já vinculada à obra (não passa pelo estado "depósito").
alter type public.ferramenta_status add value if not exists 'locada';
