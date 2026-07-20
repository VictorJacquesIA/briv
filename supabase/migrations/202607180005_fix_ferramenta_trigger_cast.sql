-- 202607180004 usava um CASE sem cast explícito pro enum ferramenta_status
-- no UPDATE de sincronização — Postgres resolve o CASE como text nesse
-- contexto e recusa atribuir a uma coluna enum sem cast. Corrige com ::public.ferramenta_status.

create or replace function public.check_and_sync_ferramenta_movimentacao()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status public.ferramenta_status;
begin
  select status into v_status from public.ferramentas where id = new.ferramenta_id for update;

  if v_status is null then
    raise exception 'Ferramenta não encontrada.';
  end if;

  if new.tipo = 'saida' and v_status = 'emprestada' then
    raise exception 'Esta ferramenta já está emprestada.';
  end if;

  if new.tipo = 'entrada' and v_status = 'deposito' then
    raise exception 'Esta ferramenta já está no depósito.';
  end if;

  update public.ferramentas
  set status = (case when new.tipo = 'saida' then 'emprestada' else 'deposito' end)::public.ferramenta_status,
      obra_atual_id = case when new.tipo = 'saida' then new.obra_id else null end
  where id = new.ferramenta_id;

  return new;
end;
$$;
