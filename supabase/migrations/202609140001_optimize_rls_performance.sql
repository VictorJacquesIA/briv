-- Otimiza performance de RLS, sem mudar nenhuma regra de acesso:
--
-- 1) Evita reavaliação de auth.uid() por linha em policies que chamam a
--    função diretamente (Supabase advisor "Auth RLS Initialization Plan"),
--    envolvendo em (select auth.uid()) -- comportamento idêntico, só deixa
--    o Postgres resolver uma vez por query em vez de uma vez por linha.
--    Isso fica mais caro conforme as tabelas crescem (historico,
--    solicitacoes, lancamentos_mo etc. já com bastante volume).
--
-- 2) Remove policies permissivas duplicadas (Supabase advisor "Multiple
--    Permissive Policies"): várias tabelas tinham uma policy "FOR ALL"
--    administrativa e uma policy de leitura separada mais ampla -- o
--    Postgres tinha que avaliar as duas em todo SELECT, mesmo a policy
--    "FOR ALL" nunca acrescentando acesso nenhum ali (a policy de SELECT
--    dedicada já cobria tudo que a policy "FOR ALL" cobriria). Divide cada
--    "FOR ALL" em policies de INSERT/UPDATE/DELETE (sem SELECT) -- Postgres
--    não suporta uma única policy com mais de um comando explícito, só
--    ALL ou um comando específico.
--
-- Em colaboradores e profiles havia também sobreposição real de INSERT/
-- UPDATE entre a policy administrativa e uma policy de grupo de role
-- diferente (gestor_obra insere colaborador; usuário edita o próprio
-- perfil) -- essas foram mescladas numa única policy por comando com OR,
-- preservando exatamente o mesmo acesso combinado de antes.

-- ============================================================
-- Parte 1 -- wrap de auth.uid() em (select auth.uid())
-- ============================================================

drop policy if exists profiles_select_same_tenant on public.profiles;
create policy profiles_select_same_tenant on public.profiles
  for select
  using ((id = (select auth.uid())) or same_cliente(cliente_id));

drop policy if exists user_permissions_self_select on public.user_permissions;
create policy user_permissions_self_select on public.user_permissions
  for select
  using ((user_id = (select auth.uid())) or is_admin());

drop policy if exists solicitacoes_owner_or_privileged_update on public.solicitacoes;
create policy solicitacoes_owner_or_privileged_update on public.solicitacoes
  for update
  using (
    same_cliente(cliente_id)
    and (
      (solicitante_id = (select auth.uid()))
      or (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (current_profile_role() = 'gestor_obra'::user_role and responsavel_obra_id = (select auth.uid()))
    )
  )
  with check (same_cliente(cliente_id));

drop policy if exists solicitacoes_tenant_select on public.solicitacoes;
create policy solicitacoes_tenant_select on public.solicitacoes
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (responsavel_obra_id = (select auth.uid()))
    )
  );

drop policy if exists solicitacoes_tenant_insert on public.solicitacoes;
create policy solicitacoes_tenant_insert on public.solicitacoes
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = solicitacoes.obra_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists lancamentos_mo_insert on public.lancamentos_mo;
create policy lancamentos_mo_insert on public.lancamentos_mo
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = lancamentos_mo.obra_id
            and ou.user_id = (select auth.uid())
            and ou.ativo = true
        )
      )
    )
  );

drop policy if exists lancamentos_mo_tenant_select on public.lancamentos_mo;
create policy lancamentos_mo_tenant_select on public.lancamentos_mo
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() <> 'gestor_obra'::user_role)
      or exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = lancamentos_mo.obra_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists contratos_mo_insert on public.contratos_mo;
create policy contratos_mo_insert on public.contratos_mo
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = contratos_mo.obra_id
            and ou.user_id = (select auth.uid())
            and ou.ativo = true
        )
      )
    )
  );

drop policy if exists contratos_mo_tenant_select on public.contratos_mo;
create policy contratos_mo_tenant_select on public.contratos_mo
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() <> 'gestor_obra'::user_role)
      or exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = contratos_mo.obra_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists obra_usuarios_self_select on public.obra_usuarios;
create policy obra_usuarios_self_select on public.obra_usuarios
  for select
  using (
    (user_id = (select auth.uid()))
    or (
      current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role])
      and exists (
        select 1 from public.obras o
        where o.id = obra_usuarios.obra_id and same_cliente(o.cliente_id)
      )
    )
  );

drop policy if exists cacambas_tenant_select on public.cacambas;
create policy cacambas_tenant_select on public.cacambas
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() <> 'gestor_obra'::user_role)
      or exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = cacambas.obra_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists cacamba_eventos_insert on public.cacamba_eventos;
create policy cacamba_eventos_insert on public.cacamba_eventos
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and tipo = any (array['pedido_troca'::cacamba_evento_tipo, 'pedido_devolucao'::cacamba_evento_tipo])
        and exists (
          select 1 from public.cacambas c
          join public.obra_usuarios ou on ou.obra_id = c.obra_id
          where c.id = cacamba_eventos.cacamba_id
            and ou.user_id = (select auth.uid())
            and ou.ativo = true
        )
      )
    )
  );

drop policy if exists cacamba_eventos_tenant_select on public.cacamba_eventos;
create policy cacamba_eventos_tenant_select on public.cacamba_eventos
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() <> 'gestor_obra'::user_role)
      or exists (
        select 1 from public.cacambas c
        join public.obra_usuarios ou on ou.obra_id = c.obra_id
        where c.id = cacamba_eventos.cacamba_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists solicitacoes_desmobilizacao_insert on public.solicitacoes_desmobilizacao;
create policy solicitacoes_desmobilizacao_insert on public.solicitacoes_desmobilizacao
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = solicitacoes_desmobilizacao.obra_id
            and ou.user_id = (select auth.uid())
            and ou.ativo = true
        )
      )
    )
  );

drop policy if exists solicitacoes_desmobilizacao_tenant_select on public.solicitacoes_desmobilizacao;
create policy solicitacoes_desmobilizacao_tenant_select on public.solicitacoes_desmobilizacao
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() <> 'gestor_obra'::user_role)
      or exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = solicitacoes_desmobilizacao.obra_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists ferramenta_solicitacoes_tenant_select on public.ferramenta_solicitacoes;
create policy ferramenta_solicitacoes_tenant_select on public.ferramenta_solicitacoes
  for select
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() <> 'gestor_obra'::user_role)
      or exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = ferramenta_solicitacoes.obra_id
          and ou.user_id = (select auth.uid())
          and ou.ativo = true
      )
    )
  );

drop policy if exists ferramenta_solicitacoes_insert on public.ferramenta_solicitacoes;
create policy ferramenta_solicitacoes_insert on public.ferramenta_solicitacoes
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = ferramenta_solicitacoes.obra_id
            and ou.user_id = (select auth.uid())
            and ou.ativo = true
        )
      )
    )
  );

-- ============================================================
-- Parte 2 -- elimina policies permissivas duplicadas
-- ============================================================

-- aprovacoes: aprovacoes_tenant_select já cobre o SELECT que
-- aprovacoes_gestor_admin_write concederia (mesma condição
-- can_access_solicitacao, sem restrição de role) -- tira SELECT da policy
-- de escrita, dividindo em insert/update/delete.
drop policy if exists aprovacoes_gestor_admin_write on public.aprovacoes;
create policy aprovacoes_gestor_admin_insert on public.aprovacoes
  for insert
  with check (
    (current_profile_role() = any (array['adm_geral'::user_role, 'gestor_obra'::user_role]))
    and can_access_solicitacao(solicitacao_id)
  );
create policy aprovacoes_gestor_admin_update on public.aprovacoes
  for update
  using (
    (current_profile_role() = any (array['adm_geral'::user_role, 'gestor_obra'::user_role]))
    and can_access_solicitacao(solicitacao_id)
  )
  with check (
    (current_profile_role() = any (array['adm_geral'::user_role, 'gestor_obra'::user_role]))
    and can_access_solicitacao(solicitacao_id)
  );
create policy aprovacoes_gestor_admin_delete on public.aprovacoes
  for delete
  using (
    (current_profile_role() = any (array['adm_geral'::user_role, 'gestor_obra'::user_role]))
    and can_access_solicitacao(solicitacao_id)
  );

-- cacambas: cacambas_tenant_select já cobre o SELECT (é estritamente mais
-- ampla -- inclui qualquer role != gestor_obra, não só adm/compras).
drop policy if exists cacambas_write on public.cacambas;
create policy cacambas_insert on public.cacambas
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = cacambas.obra_id and ou.user_id = (select auth.uid()) and ou.ativo = true
        )
      )
    )
  );
create policy cacambas_update on public.cacambas
  for update
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = cacambas.obra_id and ou.user_id = (select auth.uid()) and ou.ativo = true
        )
      )
    )
  )
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = cacambas.obra_id and ou.user_id = (select auth.uid()) and ou.ativo = true
        )
      )
    )
  );
create policy cacambas_delete on public.cacambas
  for delete
  using (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or (
        current_profile_role() = 'gestor_obra'::user_role
        and exists (
          select 1 from public.obra_usuarios ou
          where ou.obra_id = cacambas.obra_id and ou.user_id = (select auth.uid()) and ou.ativo = true
        )
      )
    )
  );

-- clientes
drop policy if exists clientes_admin_write on public.clientes;
create policy clientes_admin_insert on public.clientes
  for insert
  with check (is_admin() and id = current_profile_cliente_id());
create policy clientes_admin_update on public.clientes
  for update
  using (is_admin() and id = current_profile_cliente_id())
  with check (is_admin() and id = current_profile_cliente_id());
create policy clientes_admin_delete on public.clientes
  for delete
  using (is_admin() and id = current_profile_cliente_id());

-- colaboradores: mescla colaboradores_admin_compras_write (ALL) +
-- colaboradores_gestor_insert (INSERT) numa única policy de INSERT, já que
-- cobriam grupos de role diferentes pro mesmo comando -- e tira SELECT
-- (coberto por colaboradores_tenant_select, mais ampla, sem mudança aqui).
drop policy if exists colaboradores_admin_compras_write on public.colaboradores;
drop policy if exists colaboradores_gestor_insert on public.colaboradores;
create policy colaboradores_insert on public.colaboradores
  for insert
  with check (
    same_cliente(cliente_id)
    and (
      (current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
      or current_profile_role() = 'gestor_obra'::user_role
    )
  );
create policy colaboradores_update on public.colaboradores
  for update
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy colaboradores_delete on public.colaboradores
  for delete
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));

-- despesas_manuais
drop policy if exists despesas_manuais_admin_compras_write on public.despesas_manuais;
create policy despesas_manuais_admin_compras_insert on public.despesas_manuais
  for insert
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy despesas_manuais_admin_compras_update on public.despesas_manuais
  for update
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy despesas_manuais_admin_compras_delete on public.despesas_manuais
  for delete
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));

-- estoque_itens
drop policy if exists estoque_itens_write on public.estoque_itens;
create policy estoque_itens_insert on public.estoque_itens
  for insert
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]));
create policy estoque_itens_update on public.estoque_itens
  for update
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]))
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]));
create policy estoque_itens_delete on public.estoque_itens
  for delete
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]));

-- ferramentas
drop policy if exists ferramentas_write on public.ferramentas;
create policy ferramentas_insert on public.ferramentas
  for insert
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]));
create policy ferramentas_update on public.ferramentas
  for update
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]))
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]));
create policy ferramentas_delete on public.ferramentas
  for delete
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role, 'almox'::user_role]));

-- fornecedores
drop policy if exists fornecedores_admin_comprador_write on public.fornecedores;
create policy fornecedores_admin_comprador_insert on public.fornecedores
  for insert
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy fornecedores_admin_comprador_update on public.fornecedores
  for update
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy fornecedores_admin_comprador_delete on public.fornecedores
  for delete
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));

-- obra_orcamento_itens
drop policy if exists obra_orcamento_itens_admin_compras_write on public.obra_orcamento_itens;
create policy obra_orcamento_itens_admin_compras_insert on public.obra_orcamento_itens
  for insert
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy obra_orcamento_itens_admin_compras_update on public.obra_orcamento_itens
  for update
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]))
  with check (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));
create policy obra_orcamento_itens_admin_compras_delete on public.obra_orcamento_itens
  for delete
  using (same_cliente(cliente_id) and current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role]));

-- obra_usuarios
drop policy if exists obra_usuarios_admin_write on public.obra_usuarios;
create policy obra_usuarios_admin_insert on public.obra_usuarios
  for insert
  with check (
    current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role])
    and exists (select 1 from public.obras o where o.id = obra_usuarios.obra_id and same_cliente(o.cliente_id))
  );
create policy obra_usuarios_admin_update on public.obra_usuarios
  for update
  using (
    current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role])
    and exists (select 1 from public.obras o where o.id = obra_usuarios.obra_id and same_cliente(o.cliente_id))
  )
  with check (
    current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role])
    and exists (select 1 from public.obras o where o.id = obra_usuarios.obra_id and same_cliente(o.cliente_id))
  );
create policy obra_usuarios_admin_delete on public.obra_usuarios
  for delete
  using (
    current_profile_role() = any (array['adm_geral'::user_role, 'compras'::user_role])
    and exists (select 1 from public.obras o where o.id = obra_usuarios.obra_id and same_cliente(o.cliente_id))
  );

-- obras
drop policy if exists obras_admin_write on public.obras;
create policy obras_admin_insert on public.obras
  for insert
  with check (is_admin() and same_cliente(cliente_id));
create policy obras_admin_update on public.obras
  for update
  using (is_admin() and same_cliente(cliente_id))
  with check (is_admin() and same_cliente(cliente_id));
create policy obras_admin_delete on public.obras
  for delete
  using (is_admin() and same_cliente(cliente_id));

-- profiles: mescla profiles_admin_write (ALL) + profiles_self_update
-- (UPDATE) numa única policy de UPDATE (admin edita qualquer perfil do
-- tenant OU o próprio usuário edita o próprio perfil); tira SELECT
-- (coberto por profiles_select_same_tenant, mais ampla).
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert
  with check (is_admin() and same_cliente(cliente_id));
create policy profiles_update on public.profiles
  for update
  using ((is_admin() and same_cliente(cliente_id)) or (id = (select auth.uid())))
  with check ((is_admin() and same_cliente(cliente_id)) or (id = (select auth.uid())));
create policy profiles_admin_delete on public.profiles
  for delete
  using (is_admin() and same_cliente(cliente_id));
