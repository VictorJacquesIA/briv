-- Novos estados do fluxo de compras: recebimento de cotação (upload +
-- extração por IA), validação humana dos valores, e pedido programado
-- (fornecedor/prazo confirmados pós-aprovação).
-- O estado "autorizada" fica no enum (não vale recriar o tipo só por isso)
-- mas é retirado de todo o código de aplicação a partir desta migração.

alter type public.solicitacao_status add value if not exists 'cotacao_recebida';
alter type public.solicitacao_status add value if not exists 'validado';
alter type public.solicitacao_status add value if not exists 'pedido_programado';
