-- Dados do contratante (o cliente/proprietário daquela obra específica —
-- não confundir com `clientes`, que é o tenant/empresa dona do sistema).
-- Usado em contratos/identificação da obra: nome ou razão social, CPF ou
-- CNPJ (pessoa física ou jurídica, por isso um campo texto único em vez de
-- validar formato) e e-mail de contato.
alter table public.obras
  add column if not exists contratante_nome text,
  add column if not exists contratante_documento text,
  add column if not exists contratante_email text;
