const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function onlyDigits(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

export function waLink(phone: string | null | undefined, message: string) {
  const digits = onlyDigits(phone);
  const target = digits ? digits : "";

  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

export function cotacaoMessage(input: {
  codigo: string;
  obra: string;
  fornecedor: string;
  template?: string | null;
  pdfUrl?: string | null;
}) {
  const pdfLine = input.pdfUrl ? `PDF com os itens: ${input.pdfUrl}` : null;

  if (input.template) {
    const base = input.template
      .replaceAll("{fornecedor}", input.fornecedor)
      .replaceAll("{codigo}", input.codigo)
      .replaceAll("{obra}", input.obra);

    return pdfLine ? [base, pdfLine].join("\n") : base;
  }

  return [
    `Olá, solicitamos cotação para a solicitação ${input.codigo}.`,
    input.pdfUrl ? `Segue o link do PDF com os itens. ${input.pdfUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function cacambaMessage(input: {
  tipo: "solicitacao" | "troca";
  obra: string;
  endereco?: string | null;
}) {
  const linhaAcao =
    input.tipo === "troca"
      ? `Olá, solicitamos a troca da caçamba na obra ${input.obra}.`
      : `Olá, gostaríamos de solicitar uma caçamba para a obra ${input.obra}.`;

  return [linhaAcao, input.endereco ? `Endereço: ${input.endereco}` : null]
    .filter(Boolean)
    .join("\n");
}

export function aprovacaoMessage(input: {
  codigo: string;
  obra: string;
  approvalUrl?: string | null;
}) {
  return [
    `Aprovação pendente da solicitação ${input.codigo}.`,
    `Obra: ${input.obra}.`,
    input.approvalUrl
      ? `Link: ${appUrl}${input.approvalUrl}`
      : "Link ainda não gerado.",
  ].join("\n");
}
