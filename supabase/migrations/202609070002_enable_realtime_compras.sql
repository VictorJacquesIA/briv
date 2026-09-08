-- Painel de compras precisa atualizar sozinho quando uma solicitação,
-- cotação, aprovação ou pedido muda, sem o usuário recarregar a página.
-- Adiciona essas tabelas na publicação do Realtime; o Supabase Realtime
-- respeita as policies de RLS de cada uma (same_cliente/can_access_solicitacao),
-- então cada usuário só recebe eventos do que ele já poderia enxergar via SELECT.
alter publication supabase_realtime add table public.solicitacoes;
alter publication supabase_realtime add table public.cotacoes;
alter publication supabase_realtime add table public.aprovacoes;
alter publication supabase_realtime add table public.pedidos;
