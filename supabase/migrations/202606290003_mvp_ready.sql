alter table public.clientes
  add column if not exists inscricao_estadual text,
  add column if not exists email_nfe text,
  add column if not exists telefone text,
  add column if not exists endereco text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists cep text;

alter table public.obras
  add column if not exists telefone_responsavel text;

alter table public.fornecedores
  add column if not exists whatsapp text,
  add column if not exists endereco text;

alter table public.profiles
  add column if not exists whatsapp text;

alter table public.pedidos
  add column if not exists pdf_url text,
  add column if not exists autorizado_por_nome text,
  add column if not exists autorizado_por_email text,
  add column if not exists autorizado_at timestamptz;

alter table public.historico
  add column if not exists status_anterior text,
  add column if not exists status_novo text,
  add column if not exists ip text,
  add column if not exists user_agent text;

create or replace function public.prevent_historico_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'historico records are immutable and cannot be deleted';
end;
$$;

drop trigger if exists prevent_historico_delete on public.historico;
create trigger prevent_historico_delete
before delete on public.historico
for each row execute function public.prevent_historico_delete();

create or replace function public.prevent_historico_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'historico records are immutable and cannot be updated';
end;
$$;

drop trigger if exists prevent_historico_update on public.historico;
create trigger prevent_historico_update
before update on public.historico
for each row execute function public.prevent_historico_update();
