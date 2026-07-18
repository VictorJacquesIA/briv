-- Trava novo insert em `materiais` (tabela depreciada) mantendo select/update/
-- delete para não quebrar telas/consultas que ainda leem dados históricos.

drop policy if exists "materiais_admin_comprador_write" on public.materiais;

create policy "materiais_admin_compras_update"
on public.materiais for update
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

create policy "materiais_admin_compras_delete"
on public.materiais for delete
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));
