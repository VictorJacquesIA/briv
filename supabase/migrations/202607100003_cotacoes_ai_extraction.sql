-- Suporte a upload de cotação (PDF/foto) + extração por IA + validação
-- humana obrigatória antes dos valores virarem oficiais. Também: template
-- de WhatsApp por fornecedor, confirmação de prazo/data no pedido, e
-- vínculo do item de solicitação com o catálogo global (items).

alter table public.cotacoes
  add column if not exists arquivo_path text,
  add column if not exists arquivo_content_type text,
  add column if not exists extracao_ia jsonb,
  add column if not exists validado_por uuid references public.profiles(id) on delete set null,
  add column if not exists validado_at timestamptz;

alter table public.fornecedores
  add column if not exists mensagem_template text;

alter table public.pedidos
  add column if not exists prazo_confirmado_dias integer check (prazo_confirmado_dias is null or prazo_confirmado_dias >= 0),
  add column if not exists data_prevista_entrega date;

alter table public.solicitacao_itens
  add column if not exists item_id uuid references public.items(id) on delete set null;
