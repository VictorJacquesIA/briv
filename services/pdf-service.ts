import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function line(value: unknown, fallback = "-") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function money(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function generatePedidoCompraPdf(input: {
  pedidoNumero: string;
  solicitacao: any;
  cotacao: any;
  gestor: {
    nome: string;
    email?: string | null;
    autorizadoAt: string;
  };
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const primary = rgb(0.56, 0.72, 0.75);
  const paperDark = rgb(0.07, 0.07, 0.07);
  let y = 800;

  const draw = (text: string, x = 48, size = 10, font = regular) => {
    page.drawText(text.slice(0, 110), {
      x,
      y,
      size,
      font,
      color: rgb(0.12, 0.16, 0.2),
    });
    y -= size + 8;
  };

  page.drawRectangle({
    x: 40,
    y: 752,
    width: 515,
    height: 58,
    color: paperDark,
  });
  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public", "una_logo.png"),
    );
    const logo = await pdf.embedPng(logoBytes);
    page.drawImage(logo, { x: 52, y: 762, width: 90, height: 40 });
  } catch {
    page.drawText("UNA", {
      x: 58,
      y: 776,
      size: 20,
      font: bold,
      color: rgb(1, 1, 1),
    });
  }
  page.drawText("PEDIDO DE COMPRA", {
    x: 165,
    y: 790,
    size: 18,
    font: bold,
    color: primary,
  });
  page.drawText(`Numero: ${input.pedidoNumero}`, {
    x: 165,
    y: 768,
    size: 11,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Data: ${new Date().toLocaleDateString("pt-BR")}`, {
    x: 420,
    y: 768,
    size: 10,
    font: regular,
  });

  y = 735;
  draw("Dados da empresa", 48, 12, bold);
  draw(`Cliente/NF: ${line(input.solicitacao.cliente?.razao_social)}`);
  draw(
    `CNPJ: ${line(input.solicitacao.cliente?.cnpj)} | IE: ${line(input.solicitacao.cliente?.inscricao_estadual)}`,
  );
  draw(
    `E-mail NF: ${line(input.solicitacao.cliente?.email_nfe)} | Telefone: ${line(input.solicitacao.cliente?.telefone)}`,
  );
  draw(
    `Endereco: ${line(input.solicitacao.cliente?.endereco)} ${line(input.solicitacao.cliente?.cidade)} ${line(input.solicitacao.cliente?.uf)} ${line(input.solicitacao.cliente?.cep)}`,
  );

  y -= 8;
  draw("Dados da obra", 48, 12, bold);
  draw(
    `Obra: ${line(input.solicitacao.obra?.nome)} | Codigo: ${line(input.solicitacao.obra?.codigo)}`,
  );
  draw(`Endereco: ${line(input.solicitacao.obra?.endereco)}`);
  draw(
    `Responsavel: ${line(input.solicitacao.responsavel_obra?.nome)} | Telefone: ${line(input.solicitacao.obra?.telefone_responsavel)}`,
  );

  y -= 8;
  draw("Fornecedor escolhido", 48, 12, bold);
  draw(`Fornecedor: ${line(input.cotacao.fornecedor?.razao_social)}`);
  draw(
    `CNPJ: ${line(input.cotacao.fornecedor?.cnpj)} | Contato: ${line(input.cotacao.fornecedor?.contato)}`,
  );
  draw(
    `Email: ${line(input.cotacao.fornecedor?.email)} | Telefone: ${line(input.cotacao.fornecedor?.telefone)}`,
  );

  y -= 8;
  draw("Itens", 48, 12, bold);
  page.drawText("Descricao", { x: 48, y, size: 9, font: bold });
  page.drawText("Qtd", { x: 300, y, size: 9, font: bold });
  page.drawText("Unit.", { x: 360, y, size: 9, font: bold });
  page.drawText("Total", { x: 455, y, size: 9, font: bold });
  y -= 18;

  for (const item of input.solicitacao.itens ?? []) {
    const cotacaoItem = (input.cotacao.itens ?? []).find(
      (candidate: any) => candidate.solicitacao_item_id === item.id,
    );
    page.drawText(line(item.descricao).slice(0, 45), {
      x: 48,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(`${money(item.quantidade)} ${line(item.unidade, "")}`, {
      x: 300,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(`R$ ${money(cotacaoItem?.preco_unitario)}`, {
      x: 360,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(`R$ ${money(cotacaoItem?.valor_total)}`, {
      x: 455,
      y,
      size: 8,
      font: regular,
    });
    y -= 14;
    if (y < 140) {
      break;
    }
  }

  y -= 8;
  draw(
    `Frete: R$ ${money(input.cotacao.frete)} | Prazo: ${line(input.cotacao.prazo_dias)} dias | Pagamento: ${line(input.cotacao.forma_pagamento)}`,
    48,
    10,
    bold,
  );
  draw(
    `Total do fornecedor: R$ ${money(input.cotacao.total_fornecedor)}`,
    48,
    12,
    bold,
  );
  draw(
    `Observacoes: ${line(input.cotacao.observacoes_gerais ?? input.solicitacao.observacao)}`,
  );

  y -= 8;
  draw("Autorizacao", 48, 12, bold);
  draw(`Gestor responsavel: ${input.gestor.nome}`);
  draw(
    `E-mail: ${line(input.gestor.email)} | Data da autorizacao: ${new Date(input.gestor.autorizadoAt).toLocaleString("pt-BR")}`,
  );
  page.drawLine({
    start: { x: 48, y: 70 },
    end: { x: 260, y: 70 },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText("Assinatura do gestor", {
    x: 86,
    y: 54,
    size: 9,
    font: regular,
  });

  return pdf.save();
}

export async function generateOrcamentoRealizadoPdf(input: {
  obra: { nome: string; codigo?: string | null };
  itens: Array<{
    descricao: string;
    categoria?: string | null;
    valor_orcado: number;
    material_realizado: number;
    mo_realizado: number;
  }>;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const primary = rgb(0.56, 0.72, 0.75);
  let y = 800;

  const draw = (text: string, x = 48, size = 10, font = regular) => {
    page.drawText(text.slice(0, 110), {
      x,
      y,
      size,
      font,
      color: rgb(0.12, 0.16, 0.2),
    });
    y -= size + 8;
  };

  page.drawText("ORÇADO x REALIZADO", {
    x: 48,
    y,
    size: 18,
    font: bold,
    color: primary,
  });
  y -= 26;
  draw(
    `Obra: ${line(input.obra.nome)} | Código: ${line(input.obra.codigo)}`,
    48,
    11,
    bold,
  );
  draw(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);

  y -= 8;
  page.drawText("Item", { x: 48, y, size: 9, font: bold });
  page.drawText("Orçado", { x: 280, y, size: 9, font: bold });
  page.drawText("Material realizado", { x: 350, y, size: 9, font: bold });
  page.drawText("MO realizado", { x: 470, y, size: 9, font: bold });
  y -= 18;

  let totalOrcado = 0;
  let totalMaterial = 0;
  let totalMo = 0;

  for (const item of input.itens) {
    totalOrcado += Number(item.valor_orcado ?? 0);
    totalMaterial += Number(item.material_realizado ?? 0);
    totalMo += Number(item.mo_realizado ?? 0);

    page.drawText(line(item.descricao).slice(0, 40), {
      x: 48,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(`R$ ${money(item.valor_orcado)}`, {
      x: 280,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(`R$ ${money(item.material_realizado)}`, {
      x: 350,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(`R$ ${money(item.mo_realizado)}`, {
      x: 470,
      y,
      size: 8,
      font: regular,
    });
    y -= 14;

    if (y < 100) {
      break;
    }
  }

  y -= 12;
  draw(
    `Total orçado: R$ ${money(totalOrcado)}  |  Total realizado: R$ ${money(totalMaterial + totalMo)}`,
    48,
    11,
    bold,
  );

  return pdf.save();
}
