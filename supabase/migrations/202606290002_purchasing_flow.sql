alter type public.solicitacao_status add value if not exists 'aguardando_aprovacao';
alter type public.solicitacao_status add value if not exists 'autorizada';
alter type public.solicitacao_status add value if not exists 'pdf_gerado';
alter type public.solicitacao_status add value if not exists 'pedido_enviado';
alter type public.solicitacao_status add value if not exists 'finalizada';

create type public.prioridade_solicitacao as enum ('baixa', 'normal', 'alta', 'urgente');

alter table public.solicitacoes
  add column if not exists codigo text,
  add column if not exists responsavel_obra_id uuid references public.profiles(id) on delete set null,
  add column if not exists prioridade public.prioridade_solicitacao not null default 'normal',
  add column if not exists aprovacao_token text,
  add column if not exists aprovacao_token_expires_at timestamptz,
  add column if not exists fornecedor_aprovado_id uuid references public.fornecedores(id) on delete restrict,
  add column if not exists justificativa_excecao text,
  add column if not exists pdf_gerado_at timestamptz,
  add column if not exists pedido_enviado_at timestamptz,
  add column if not exists finalizada_at timestamptz,
  add column if not exists cancelada_at timestamptz;

alter table public.cotacoes
  add column if not exists frete numeric(14, 2),
  add column if not exists prazo_dias integer check (prazo_dias is null or prazo_dias >= 0),
  add column if not exists forma_pagamento text,
  add column if not exists observacoes_gerais text,
  add column if not exists total_fornecedor numeric(14, 2) not null default 0 check (total_fornecedor >= 0);

alter table public.cotacao_itens
  add column if not exists valor_total numeric(14, 2) not null default 0 check (valor_total >= 0),
  add column if not exists item_nao_cotado boolean not null default false;

alter table public.aprovacoes
  alter column aprovador_id drop not null,
  add column if not exists gestor_nome text,
  add column if not exists gestor_email text,
  add column if not exists fornecedor_escolhido_id uuid references public.fornecedores(id) on delete restrict;

create table if not exists public.solicitacao_anexos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  nome_arquivo text not null,
  storage_path text not null,
  content_type text,
  tamanho_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_solicitacoes_codigo_cliente
on public.solicitacoes(cliente_id, codigo)
where codigo is not null;

create unique index if not exists idx_solicitacoes_aprovacao_token
on public.solicitacoes(aprovacao_token)
where aprovacao_token is not null;

create index if not exists idx_solicitacao_anexos_solicitacao_id
on public.solicitacao_anexos(solicitacao_id);

alter table public.solicitacao_anexos enable row level security;

create policy "solicitacao_anexos_tenant_access"
on public.solicitacao_anexos for all
using (public.same_cliente(cliente_id))
with check (public.same_cliente(cliente_id));
