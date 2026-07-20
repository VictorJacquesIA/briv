-- 202607120003_profile_self_edit.sql criou insert/update/delete pro bucket
-- "avatars", mas esqueceu o select — e o upload usa upsert:true, que vira
-- um INSERT ... ON CONFLICT DO UPDATE por baixo dos panos. Pra resolver o
-- conflito, o Postgres precisa conseguir LER a linha existente, o que exige
-- satisfazer a policy de SELECT (não só insert/update) — sem ela, TODO
-- usuário autenticado (não só um papel específico) toma "permission
-- denied"/"row-level security policy" ao tentar subir a própria foto.
--
-- Restrita ao próprio arquivo (mesma convenção de path das outras policies
-- de avatars) em vez de liberar o bucket inteiro: exibir a foto de outros
-- usuários não passa por aqui (usa a URL pública via getPublicUrl, que não
-- depende dessa RLS), então não há necessidade de listar/ler arquivos de
-- terceiros — só o suficiente pro upsert da própria foto funcionar.
drop policy if exists "storage_avatars_select_all" on storage.objects;
drop policy if exists "storage_avatars_select_own" on storage.objects;
create policy "storage_avatars_select_own"
on storage.objects for select
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
  and split_part(name, '/', 2) = auth.uid()::text
);
