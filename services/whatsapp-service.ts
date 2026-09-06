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
    `Olá, ${input.fornecedor}.`,
    `Solicitamos cotação para a solicitação ${input.codigo}, obra ${input.obra}.`,
    "Por favor, informe o valor unitário de cada item.",
    pdfLine,
  ]
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
