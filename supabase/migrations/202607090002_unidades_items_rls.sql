-- Liga RLS em unidades/items (catálogo global, sem cliente_id).
-- Leitura: qualquer usuário autenticado com profile ativo.
-- Insert: qualquer role (inclui gestor_obra, para cadastro rápido de item faltante).
-- Update/delete: só adm_geral e compras.

alter table public.unidades enable row level security;
alter table public.items enable row level security;

drop policy if exists "unidades_select_authenticated" on public.unidades;
create policy "unidades_select_authenticated"
on public.unidades for select
using (public.current_profile_role() is not null);

drop policy if exists "unidades_insert_any_role" on public.unidades;
create policy "unidades_insert_any_role"
on public.unidades for insert
with check (public.current_profile_role() is not null);

drop policy if exists "unidades_admin_compras_update" on public.unidades;
create policy "unidades_admin_compras_update"
on public.unidades for update
using (public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.current_profile_role() in ('adm_geral', 'compras'));

drop policy if exists "unidades_admin_compras_delete" on public.unidades;
create policy "unidades_admin_compras_delete"
on public.unidades for delete
using (public.current_profile_role() in ('adm_geral', 'compras'));

drop policy if exists "items_select_authenticated" on public.items;
create policy "items_select_authenticated"
on public.items for select
using (public.current_profile_role() is not null);

drop policy if exists "items_insert_any_role" on public.items;
create policy "items_insert_any_role"
on public.items for insert
with check (public.current_profile_role() is not null);

drop policy if exists "items_admin_compras_update" on public.items;
create policy "items_admin_compras_update"
on public.items for update
using (public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.current_profile_role() in ('adm_geral', 'compras'));

drop policy if exists "items_admin_compras_delete" on public.items;
create policy "items_admin_compras_delete"
on public.items for delete
using (public.current_profile_role() in ('adm_geral', 'compras'));
