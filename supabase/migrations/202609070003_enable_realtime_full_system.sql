-- Extensão do Realtime (ligado antes só pra compras) pro sistema inteiro:
-- pagamentos de mão de obra, caçambas/desmobilização, estoque, ferramentas,
-- obras, fornecedores, materiais e histórico. Qualquer alteração nessas
-- tabelas agora é escutada pelo painel e atualiza a tela sozinha. RLS de
-- cada tabela continua sendo respeitada pelo Realtime normalmente.
alter publication supabase_realtime add table public.solicitacao_itens;
alter publication supabase_realtime add table public.solicitacao_anexos;
alter publication supabase_realtime add table public.historico;
alter publication supabase_realtime add table public.requisicoes_almox;
alter publication supabase_realtime add table public.requisicao_almox_itens;
alter publication supabase_realtime add table public.movimentacoes_estoque;
alter publication supabase_realtime add table public.estoque_itens;
alter publication supabase_realtime add table public.lancamentos_mo;
alter publication supabase_realtime add table public.contratos_mo;
alter publication supabase_realtime add table public.colaboradores;
alter publication supabase_realtime add table public.cacambas;
alter publication supabase_realtime add table public.cacamba_eventos;
alter publication supabase_realtime add table public.solicitacoes_desmobilizacao;
alter publication supabase_realtime add table public.obras;
alter publication supabase_realtime add table public.obra_usuarios;
alter publication supabase_realtime add table public.obra_orcamento_itens;
alter publication supabase_realtime add table public.despesas_manuais;
alter publication supabase_realtime add table public.ferramentas;
alter publication supabase_realtime add table public.movimentacoes_ferramentas;
alter publication supabase_realtime add table public.fornecedores;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.unidades;
alter publication supabase_realtime add table public.profiles;
