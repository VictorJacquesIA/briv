-- Permite escolher o fornecedor da caçamba pra gerar a mensagem de
-- WhatsApp de solicitação/troca com o contato certo.
alter table public.cacambas
  add column if not exists fornecedor_id uuid references public.fornecedores(id) on delete set null;
