-- Redesenho da experiência do Gestor de Obra:
-- 1) colaboradores ganham dados de recebimento (chave Pix / dados bancários)
--    e gestor_obra passa a poder cadastrar (INSERT) prestadores, sem poder
--    editar/desativar os já existentes (isso continua exclusivo de
--    adm_geral/compras via colaboradores_admin_compras_write).
-- 2) lancamentos_mo ganham qtd_diarias/valor_diaria como metadado de
--    auditoria — o total continua sendo gravado em `valor`, único campo lido
--    por v_colaborador_saldo e v_obra_orcamento_realizado, então nenhuma view
--    precisa mudar.

alter table public.colaboradores
  add column if not exists chave_pix text,
  add column if not exists dados_bancarios text;

drop policy if exists "colaboradores_gestor_insert" on public.colaboradores;
create policy "colaboradores_gestor_insert"
on public.colaboradores for insert
with check (
  public.same_cliente(cliente_id)
  and public.current_profile_role() = 'gestor_obra'
);

alter table public.lancamentos_mo
  add column if not exists qtd_diarias numeric(6,2),
  add column if not exists valor_diaria numeric(14,2);

alter table public.lancamentos_mo
  drop constraint if exists lancamentos_mo_diarias_check;
alter table public.lancamentos_mo
  add constraint lancamentos_mo_diarias_check
  check (
    (qtd_diarias is null and valor_diaria is null)
    or (qtd_diarias is not null and valor_diaria is not null and qtd_diarias > 0 and valor_diaria > 0)
  );
