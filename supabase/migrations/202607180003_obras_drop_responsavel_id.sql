-- "Responsável" (obras.responsavel_id, um profile qualquer como contato)
-- virou redundante com o novo conceito de "Gestor de obra" (obra_usuarios,
-- que efetivamente concede acesso de gestor_obra e é o que compras/adm
-- gerenciam na própria tela da obra). telefone_responsavel fica — é usado
-- como telefone de contato da obra no PDF de pedido (services/pdf-service.ts),
-- sem relação com qual profile é "responsável".

alter table public.obras
  drop column if exists responsavel_id;
