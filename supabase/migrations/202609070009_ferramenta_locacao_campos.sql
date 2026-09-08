-- Campos de locação: fornecedor, custo, data prevista de devolução e
-- controle da mensagem de WhatsApp (mesma lógica da caçamba) + data de
-- entrega confirmada.
alter table public.ferramentas
  add column if not exists fornecedor_id uuid references public.fornecedores(id) on delete set null,
  add column if not exists valor_locacao numeric(14,2),
  add column if not exists data_prevista_devolucao date,
  add column if not exists mensagem_enviada_em timestamptz,
  add column if not exists entregue_em timestamptz;

-- 'locada' também exige obra_atual_id (igual 'emprestada') — só 'deposito'
-- fica sem obra.
alter table public.ferramentas
  drop constraint ferramentas_status_obra_consistente_check;

alter table public.ferramentas
  add constraint ferramentas_status_obra_consistente_check check (
    (status = 'deposito' and obra_atual_id is null)
    or (status in ('emprestada', 'locada') and obra_atual_id is not null)
  );

-- Gestor de obra passa a poder ver o catálogo de ferramentas (somente
-- leitura) — necessário pra exibir o nome da ferramenta vinculada às
-- próprias solicitações dele.
drop policy "ferramentas_tenant_select" on public.ferramentas;
create policy "ferramentas_tenant_select"
on public.ferramentas for select
using (public.same_cliente(cliente_id) and public.current_profile_role() in ('adm_geral', 'compras', 'almox', 'gestor_obra'));
