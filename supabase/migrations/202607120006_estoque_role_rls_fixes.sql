-- Correção de RLS para o novo papel 'almox' (e qualquer papel futuro):
-- várias policies de solicitações usavam exclusão
-- (current_profile_role() <> 'gestor_obra') como atalho pra "é
-- adm_geral/compras" — o que faria um almox herdar acesso total a
-- Compras "de graça". Troca pra lista de inclusão explícita.
--
-- Bônus: corrige um bug real encontrado ao reescrever
-- solicitacoes_tenant_insert — o EXISTS comparava
-- "obra_usuarios.obra_id = obra_id", mas dentro do subquery o nome
-- "obra_id" (sem qualificador) resolve pra própria obra_usuarios (que
-- também tem essa coluna), virando uma tautologia
-- (ou.obra_id = ou.obra_id, sempre verdadeira). Na prática, qualquer
-- gestor_obra vinculado a QUALQUER obra podia criar solicitação pra
-- QUALQUER outra obra. Corrigido qualificando explicitamente com o nome
-- da tabela (solicitacoes.obra_id).

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
        public.current_profile_role() in ('adm_geral', 'compras')
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
    public.current_profile_role() in ('adm_geral', 'compras')
    or responsavel_obra_id = auth.uid()
  )
);

drop policy if exists "solicitacoes_tenant_insert" on public.solicitacoes;
create policy "solicitacoes_tenant_insert"
on public.solicitacoes for insert
with check (
  public.same_cliente(cliente_id)
  and (
    public.current_profile_role() in ('adm_geral', 'compras')
    or exists (
      select 1 from public.obra_usuarios ou
      where ou.obra_id = solicitacoes.obra_id and ou.user_id = auth.uid() and ou.ativo = true
    )
  )
);
