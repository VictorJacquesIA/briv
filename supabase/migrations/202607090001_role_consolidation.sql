-- Consolida o enum public.user_role para apenas adm_geral/compras/gestor_obra,
-- migrando dados existentes, e liga RLS em user_permissions e obra_usuarios
-- (hoje sem RLS, permitindo leitura/escrita entre tenants).

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'administrador'
  ) then
    -- 1. Novo enum só com os 3 valores alvo
    create type public.user_role_new as enum ('adm_geral', 'compras', 'gestor_obra');

    -- 2. Derrubar policies que dependem de current_profile_role()/is_admin()
    drop policy if exists "clientes_select_same_tenant" on public.clientes;
    drop policy if exists "clientes_admin_write" on public.clientes;
    drop policy if exists "profiles_admin_write" on public.profiles;
    drop policy if exists "obras_admin_write" on public.obras;
    drop policy if exists "fornecedores_admin_comprador_write" on public.fornecedores;
    drop policy if exists "materiais_admin_comprador_write" on public.materiais;
    drop policy if exists "solicitacoes_owner_or_privileged_update" on public.solicitacoes;
    drop policy if exists "solicitacoes_tenant_insert" on public.solicitacoes;
    drop policy if exists "aprovacoes_gestor_admin_write" on public.aprovacoes;
    drop policy if exists "storage_delete_tenant_folder_admin" on storage.objects;

    -- 3. Derrubar funções cujo tipo de retorno muda
    drop function if exists public.is_admin();
    drop function if exists public.current_profile_role();

    -- 4. Migrar a coluna profiles.role para o novo tipo
    alter table public.profiles alter column role drop default;

    alter table public.profiles
      alter column role type public.user_role_new
      using (
        case role::text
          when 'administrador' then 'adm_geral'
          when 'comprador' then 'compras'
          when 'gestor' then 'gestor_obra'
          else role::text
        end
      )::public.user_role_new;

    alter table public.profiles alter column role set default 'compras'::public.user_role_new;

    -- 5. Trocar o tipo antigo pelo novo
    drop type public.user_role;
    alter type public.user_role_new rename to user_role;

    -- 6. Recriar as funções com o novo tipo
    create function public.current_profile_role()
    returns public.user_role
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select role from public.profiles where id = auth.uid() and ativo = true
    $fn$;

    create function public.is_admin()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select coalesce(public.current_profile_role() = 'adm_geral', false)
    $fn$;

    -- 7. Recriar as policies derrubadas com os literais novos
    create policy "clientes_select_same_tenant"
    on public.clientes for select
    using (id = public.current_profile_cliente_id() or public.is_admin());

    create policy "clientes_admin_write"
    on public.clientes for all
    using (public.is_admin())
    with check (public.is_admin());

    create policy "profiles_admin_write"
    on public.profiles for all
    using (public.is_admin() and public.same_cliente(cliente_id))
    with check (public.is_admin() and public.same_cliente(cliente_id));

    create policy "obras_admin_write"
    on public.obras for all
    using (public.is_admin() and public.same_cliente(cliente_id))
    with check (public.is_admin() and public.same_cliente(cliente_id));

    create policy "fornecedores_admin_comprador_write"
    on public.fornecedores for all
    using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
    with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

    create policy "materiais_admin_comprador_write"
    on public.materiais for all
    using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'))
    with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras'));

    create policy "solicitacoes_owner_or_privileged_update"
    on public.solicitacoes for update
    using (
      public.same_cliente(cliente_id)
      and (solicitante_id = auth.uid() or public.current_profile_role() in ('adm_geral', 'compras', 'gestor_obra'))
    )
    with check (public.same_cliente(cliente_id));

    -- Hardening: insert de solicitacoes exige, para gestor_obra, vínculo com a obra
    -- via obra_usuarios (defesa em profundidade; a validação principal fica no
    -- server action createSolicitacao).
    create policy "solicitacoes_tenant_insert"
    on public.solicitacoes for insert
    with check (
      public.same_cliente(cliente_id)
      and (
        public.current_profile_role() <> 'gestor_obra'
        or exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = obra_id and ou.user_id = auth.uid() and ou.ativo = true
        )
      )
    );

    create policy "aprovacoes_gestor_admin_write"
    on public.aprovacoes for all
    using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'gestor_obra'))
    with check (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'gestor_obra'));

    create policy "storage_delete_tenant_folder_admin"
    on storage.objects for delete
    using (
      bucket_id in ('pedidos-pdf', 'anexos')
      and split_part(name, '/', 1) = public.current_profile_cliente_id()::text
      and public.is_admin()
    );
  end if;
end;
$$;

-- Liga RLS em user_permissions e obra_usuarios (hoje sem nenhuma policy,
-- ou seja, qualquer usuário autenticado lê/escreve linhas de qualquer tenant).

alter table public.user_permissions enable row level security;
alter table public.obra_usuarios enable row level security;

drop policy if exists "user_permissions_self_select" on public.user_permissions;
create policy "user_permissions_self_select"
on public.user_permissions for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_permissions_admin_insert" on public.user_permissions;
create policy "user_permissions_admin_insert"
on public.user_permissions for insert
with check (
  public.is_admin()
  and exists (select 1 from public.profiles p where p.id = user_id and public.same_cliente(p.cliente_id))
);

drop policy if exists "user_permissions_admin_update" on public.user_permissions;
create policy "user_permissions_admin_update"
on public.user_permissions for update
using (
  public.is_admin()
  and exists (select 1 from public.profiles p where p.id = user_id and public.same_cliente(p.cliente_id))
)
with check (
  public.is_admin()
  and exists (select 1 from public.profiles p where p.id = user_id and public.same_cliente(p.cliente_id))
);

drop policy if exists "user_permissions_admin_delete" on public.user_permissions;
create policy "user_permissions_admin_delete"
on public.user_permissions for delete
using (
  public.is_admin()
  and exists (select 1 from public.profiles p where p.id = user_id and public.same_cliente(p.cliente_id))
);

drop policy if exists "obra_usuarios_self_select" on public.obra_usuarios;
create policy "obra_usuarios_self_select"
on public.obra_usuarios for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "obra_usuarios_admin_write" on public.obra_usuarios;
create policy "obra_usuarios_admin_write"
on public.obra_usuarios for all
using (
  public.is_admin()
  and exists (select 1 from public.obras o where o.id = obra_id and public.same_cliente(o.cliente_id))
)
with check (
  public.is_admin()
  and exists (select 1 from public.obras o where o.id = obra_id and public.same_cliente(o.cliente_id))
);
