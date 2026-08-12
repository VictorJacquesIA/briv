-- Infra mínima de rate limiting (achado de auditoria: nenhuma rota pública
-- tinha qualquer proteção contra automação/brute force — login, aprovação
-- pública, extração por IA, etc). Sem Redis/Upstash no projeto, usa o
-- próprio Postgres: uma tabela de "hits" por chave lógica + função atômica
-- que conta e já limpa hits fora da janela a cada chamada.

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  rl_key text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_hits_key_created on public.rate_limit_hits(rl_key, created_at);

alter table public.rate_limit_hits enable row level security;
-- Nenhuma policy: acesso só através da função security definer abaixo.

create or replace function public.check_rate_limit(
  p_key text,
  p_max_hits int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.rate_limit_hits
  where rl_key = p_key
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.rate_limit_hits
  where rl_key = p_key;

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into public.rate_limit_hits (rl_key) values (p_key);
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
