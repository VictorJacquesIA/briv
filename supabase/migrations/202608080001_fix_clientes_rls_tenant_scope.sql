-- Corrige duas policies de `clientes` que não amarravam is_admin() ao tenant
-- do próprio admin — achado da auditoria de segurança de 2026-08-08:
--
-- 1) clientes_select_same_tenant: "or is_admin()" deixava qualquer adm_geral
--    listar TODAS as empresas do SaaS (razão social, CNPJ, endereço), não só
--    a própria.
-- 2) clientes_admin_write: "for all using (is_admin())" sem checar o id do
--    tenant deixava qualquer adm_geral dar UPDATE/DELETE na linha de
--    QUALQUER outra empresa — e várias tabelas têm FK "on delete cascade"
--    pra clientes, então isso apagaria a empresa inteira de outro tenant.

drop policy if exists "clientes_select_same_tenant" on public.clientes;
create policy "clientes_select_same_tenant"
on public.clientes for select
using (id = public.current_profile_cliente_id());

drop policy if exists "clientes_admin_write" on public.clientes;
create policy "clientes_admin_write"
on public.clientes for all
using (public.is_admin() and id = public.current_profile_cliente_id())
with check (public.is_admin() and id = public.current_profile_cliente_id());
