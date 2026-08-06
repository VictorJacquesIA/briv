-- Reverte a categoria "Serviços" — caçamba passa a vincular num item de
-- orçamento tipo Insumos (escolhido manualmente por caçamba), não mais num
-- item tipo Serviços. O valor 'servicos' do enum obra_orcamento_tipo e a
-- coluna despesas_realizado/servicos_realizado da view ficam como estão
-- (Postgres não remove valor de enum sem recriar o tipo, e a coluna
-- continua funcionando — só passa a contribuir pra seção Insumos).
create or replace function public.check_cacamba_orcamento_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.orcamento_item_id is not null then
    if not exists (
      select 1 from public.obra_orcamento_itens oi
      where oi.id = new.orcamento_item_id and oi.tipo = 'insumos'
    ) then
      raise exception 'Item de orçamento selecionado não é do tipo Insumos.';
    end if;
  end if;
  return new;
end;
$$;
