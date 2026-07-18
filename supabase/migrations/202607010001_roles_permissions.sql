create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create table if not exists public.obra_usuarios (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  papel_na_obra text not null default 'gestor',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, user_id)
);

drop trigger if exists set_user_permissions_updated_at on public.user_permissions;
create trigger set_user_permissions_updated_at
before update on public.user_permissions
for each row execute function public.set_updated_at();

drop trigger if exists set_obra_usuarios_updated_at on public.obra_usuarios;
create trigger set_obra_usuarios_updated_at
before update on public.obra_usuarios
for each row execute function public.set_updated_at();

alter type public.user_role add value if not exists 'adm_geral';
alter type public.user_role add value if not exists 'compras';
alter type public.user_role add value if not exists 'gestor_obra';
