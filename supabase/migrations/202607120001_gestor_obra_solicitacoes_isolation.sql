-- Isola solicitações por gestor_obra: solicitacoes_tenant_select só checava
-- same_cliente, então qualquer gestor_obra enxergava (e, via
-- solicitacoes_owner_or_privileged_update, também editava) as solicitações de
-- QUALQUER outro gestor da mesma empresa — incluindo abrir /compras/[id] de
-- uma obra que não é dele (IDOR). Cada solicitação já guarda o gestor dono em
-- responsavel_obra_id (setado para o próprio gestor em createSolicitacao),
-- então usamos essa coluna para restringir gestor_obra à sua própria fila,
-- cascateando para as tabelas filhas (itens, anexos, cotações, cotação
-- itens, aprovações, pedidos) que hoje só validam same_cliente/cliente_id
-- direto, sem saber de qual gestor é a solicitação.

create or replace function public.can_access_solicitacao(sol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.solicitacoes s
    where s.id = sol_id
      and public.same_cliente(s.cliente_id)
      and (
        public.current_profile_role() <> 'gestor_obra'
        or s.responsavel_obra_id = auth.uid()
      )
  )
$$;

drop policy if exists "solicitacoes_tenant_select" on public.solicitacoes;
create policy "solicitacoes_tenant_select"
on public.solicitacoes for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or responsavel_obra_id = auth.uid()
  )
);

drop policy if exists "solicitacoes_owner_or_privileged_update" on public.solicitacoes;
create policy "solicitacoes_owner_or_privileged_update"
on public.solicitacoes for update
using (
  public.same_cliente(cliente_id)
  and (
    solicitante_id = auth.uid()
    or public.current_profile_role() in ('adm_geral', 'compras')
    or (public.current_profile_role() = 'gestor_obra' and responsavel_obra_id = auth.uid())
  )
)
with check (public.same_cliente(cliente_id));

drop policy if exists "solicitacao_itens_tenant_access" on public.solicitacao_itens;
create policy "solicitacao_itens_tenant_access"
on public.solicitacao_itens for all
using (public.can_access_solicitacao(solicitacao_id))
with check (public.can_access_solicitacao(solicitacao_id));

drop policy if exists "solicitacao_anexos_tenant_access" on public.solicitacao_anexos;
create policy "solicitacao_anexos_tenant_access"
on public.solicitacao_anexos for all
using (public.can_access_solicitacao(solicitacao_id))
with check (public.can_access_solicitacao(solicitacao_id));

drop policy if exists "cotacoes_tenant_access" on public.cotacoes;
create policy "cotacoes_tenant_access"
on public.cotacoes for all
using (public.can_access_solicitacao(solicitacao_id))
with check (public.can_access_solicitacao(solicitacao_id));

drop policy if exists "cotacao_itens_tenant_access" on public.cotacao_itens;
create policy "cotacao_itens_tenant_access"
on public.cotacao_itens for all
using (
  exists (
    select 1 from public.cotacoes c
    where c.id = cotacao_id and public.can_access_solicitacao(c.solicitacao_id)
  )
)
with check (
  exists (
    select 1 from public.cotacoes c
    where c.id = cotacao_id and public.can_access_solicitacao(c.solicitacao_id)
  )
);

drop policy if exists "aprovacoes_tenant_select" on public.aprovacoes;
create policy "aprovacoes_tenant_select"
on public.aprovacoes for select
using (public.can_access_solicitacao(solicitacao_id));

drop policy if exists "aprovacoes_gestor_admin_write" on public.aprovacoes;
create policy "aprovacoes_gestor_admin_write"
on public.aprovacoes for all
using (
  public.current_profile_role() in ('adm_geral', 'gestor_obra')
  and public.can_access_solicitacao(solicitacao_id)
)
with check (
  public.current_profile_role() in ('adm_geral', 'gestor_obra')
  and public.can_access_solicitacao(solicitacao_id)
);

drop policy if exists "pedidos_tenant_access" on public.pedidos;
create policy "pedidos_tenant_access"
on public.pedidos for all
using (public.can_access_solicitacao(solicitacao_id))
with check (public.can_access_solicitacao(solicitacao_id));
