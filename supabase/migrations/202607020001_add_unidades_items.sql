-- Migration: add tables for unidades and items (global catalogue)

create table if not exists unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  ativo boolean default true not null,
  created_at timestamptz default now() not null
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  unidade_id uuid references unidades(id) on delete set null,
  ativo boolean default true not null,
  created_at timestamptz default now() not null
);

-- Indexes to help lookups + enforce case-insensitive uniqueness
create unique index if not exists unidades_nome_unique on unidades(lower(nome));
create unique index if not exists items_nome_unique on items(lower(nome));
