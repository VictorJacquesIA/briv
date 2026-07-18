-- Gestor de obra passa a poder lançar qualquer tipo de pagamento de mão de
-- obra (pagamento de mão de obra/"solicitacao", reembolso, adiantamento/
-- "vale"), não só "solicitacao" — segue restrito à(s) obra(s) vinculada(s)
-- a ele via obra_usuarios.

drop policy if exists "lancamentos_mo_insert" on public.lancamentos_mo;
create policy "lancamentos_mo_insert"
on public.lancamentos_mo for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or (
      public.current_profile_role() = 'gestor_obra'
      and exists (
        select 1 from public.obra_usuarios ou
        where ou.obra_id = lancamentos_mo.obra_id and ou.user_id = auth.uid() and ou.ativo = true
      )
    )
  )
);
