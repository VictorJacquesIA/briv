-- obra_usuarios (vínculo gestor↔obra) só liberava leitura/escrita pra
-- adm_geral (is_admin()). O novo controle "Gestor de obra" na própria tela
-- da obra precisa que compras também consiga ler e trocar esse vínculo —
-- mesmo padrão de role-check já usado em lancamentos_mo_insert/contratos_mo_insert.

drop policy if exists "obra_usuarios_self_select" on public.obra_usuarios;
create policy "obra_usuarios_self_select"
on public.obra_usuarios for select
using (
  user_id = auth.uid()
  or (
    public.current_profile_role() in ('adm_geral', 'compras')
    and exists (
      select 1 from public.obras o
      where o.id = obra_id and public.same_cliente(o.cliente_id)
    )
  )
);

drop policy if exists "obra_usuarios_admin_write" on public.obra_usuarios;
create policy "obra_usuarios_admin_write"
on public.obra_usuarios for all
using (
  public.current_profile_role() in ('adm_geral', 'compras')
  and exists (
    select 1 from public.obras o
    where o.id = obra_id and public.same_cliente(o.cliente_id)
  )
)
with check (
  public.current_profile_role() in ('adm_geral', 'compras')
  and exists (
    select 1 from public.obras o
    where o.id = obra_id and public.same_cliente(o.cliente_id)
  )
);
