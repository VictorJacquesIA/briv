-- gestor_obra só pode ver informação da(s) obra(s) vinculada(s) a ele via
-- obra_usuarios — hoje o SELECT dessas tabelas era só same_cliente, então
-- um gestor autenticado (RLS é a fronteira real: todo o server usa o
-- cliente com a sessão do usuário, não a service role) via API direta
-- conseguia ler lançamento/contrato/caçamba/desmobilização de qualquer
-- obra da empresa, não só das dele. O padrão abaixo já existe nas policies
-- de INSERT dessas mesmas tabelas — só faltava espelhar no SELECT.

drop policy if exists "lancamentos_mo_tenant_select" on public.lancamentos_mo;
create policy "lancamentos_mo_tenant_select"
on public.lancamentos_mo for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or exists (
      select 1 from public.obra_usuarios ou
      where ou.obra_id = lancamentos_mo.obra_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);

drop policy if exists "contratos_mo_tenant_select" on public.contratos_mo;
create policy "contratos_mo_tenant_select"
on public.contratos_mo for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or exists (
      select 1 from public.obra_usuarios ou
      where ou.obra_id = contratos_mo.obra_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);

drop policy if exists "cacambas_tenant_select" on public.cacambas;
create policy "cacambas_tenant_select"
on public.cacambas for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or exists (
      select 1 from public.obra_usuarios ou
      where ou.obra_id = cacambas.obra_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);

-- cacamba_eventos não tem obra_id direto (só cacamba_id), então o exists
-- passa pela caçamba pra chegar na obra.
drop policy if exists "cacamba_eventos_tenant_select" on public.cacamba_eventos;
create policy "cacamba_eventos_tenant_select"
on public.cacamba_eventos for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or exists (
      select 1 from public.cacambas c
      join public.obra_usuarios ou on ou.obra_id = c.obra_id
      where c.id = cacamba_eventos.cacamba_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);

drop policy if exists "solicitacoes_desmobilizacao_tenant_select" on public.solicitacoes_desmobilizacao;
create policy "solicitacoes_desmobilizacao_tenant_select"
on public.solicitacoes_desmobilizacao for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or exists (
      select 1 from public.obra_usuarios ou
      where ou.obra_id = solicitacoes_desmobilizacao.obra_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);

drop policy if exists "ferramenta_solicitacoes_tenant_select" on public.ferramenta_solicitacoes;
create policy "ferramenta_solicitacoes_tenant_select"
on public.ferramenta_solicitacoes for select
using (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() <> 'gestor_obra'
    or exists (
      select 1 from public.obra_usuarios ou
      where ou.obra_id = ferramenta_solicitacoes.obra_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);

-- O insert original só checava o role, sem travar a obra (comentário da
-- migration original já apontava isso como "checado só na aplicação") —
-- fecha o mesmo jeito que lancamentos_mo/contratos_mo/cacambas já fazem.
drop policy if exists "ferramenta_solicitacoes_insert" on public.ferramenta_solicitacoes;
create policy "ferramenta_solicitacoes_insert"
on public.ferramenta_solicitacoes for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = ferramenta_solicitacoes.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);
