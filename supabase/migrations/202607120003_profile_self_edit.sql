-- Permite que o próprio usuário edite nome/telefone/foto do seu perfil
-- (email e senha são alterados via supabase.auth.updateUser(), não passam
-- por aqui). Hoje só existe "profiles_admin_write" (is_admin() only) — não
-- havia NENHUMA policy de update para o próprio usuário.

alter table public.profiles
  add column if not exists foto_url text;

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- A policy acima não restringe colunas — sem o trigger abaixo, o próprio
-- usuário poderia usar a policy de auto-edição para promover a role,
-- trocar de cliente_id ou reativar/desativar a própria conta via uma
-- chamada direta à API REST do Supabase (não pelo formulário da aplicação,
-- que só envia nome/telefone/foto_url).
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role <> old.role
    or new.cliente_id is distinct from old.cliente_id
    or new.ativo <> old.ativo
  then
    raise exception 'Você não pode alterar role, cliente ou status ativo do seu próprio perfil.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

-- Bucket de avatares: público para leitura (evita gerar signed URL a cada
-- render do header/sidebar), mas insert/update/delete restritos ao próprio
-- usuário dentro do próprio tenant via convenção de path
-- "<cliente_id>/<user_id>/<arquivo>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_avatars_insert_own" on storage.objects;
create policy "storage_avatars_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "storage_avatars_update_own" on storage.objects;
create policy "storage_avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
  and split_part(name, '/', 2) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "storage_avatars_delete_own" on storage.objects;
create policy "storage_avatars_delete_own"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
  and split_part(name, '/', 2) = auth.uid()::text
);
