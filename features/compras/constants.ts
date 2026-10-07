// A partir daqui a solicitação já saiu para o cliente (link de aprovação,
// PDF ou pedido) — corrigir a cotação por baixo deixaria o documento já
// enviado desatualizado. Editar só é permitido antes disso.
export const STATUSES_BLOQUEIAM_EDICAO_COTACAO = [
  // "aguardando_aprovacao" fica de fora de propósito: a página pública lê a
  // cotação ao vivo do banco (getPublicApprovalByToken), sem nada fixado
  // nessa etapa — corrigir aqui só atualiza o que o cliente vai ver da
  // próxima vez que abrir o link. O bloqueio começa quando ele já decidiu.
  "aprovacao",
  "aprovada",
  "autorizada",
  "rejeitada",
  "pdf_gerado",
  "pedido_programado",
  "pedido_enviado",
  "finalizada",
  "cancelada",
];
