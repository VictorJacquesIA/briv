import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

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

const TEXT_DARK = rgb(0.12, 0.16, 0.2);
const TEXT_MUTED = rgb(0.45, 0.47, 0.5);
const BRAND = rgb(0.29, 0.5, 0.55);
const WARNING = rgb(0.72, 0.55, 0.08);

// Content-Disposition (RFC 6266) exige ASCII no filename= simples — nomes
// com acento (obra, item, etc.) quebrariam ou virariam um nome genérico no
// navegador. filename* (RFC 5987, UTF-8 percent-encoded) é o que os
// navegadores modernos realmente usam pro nome exibido/salvo.
export function buildPdfContentDisposition(rawName: string, fallback: string) {
  const asciiFallback =
    rawName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9.-]+/g, "-")
      .replace(/-+/g, "-") || fallback;

  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(rawName)}`;
}

async function embedLogo(pdf: PDFDocument) {
  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public", "una_logo.png"),
    );
    return await pdf.embedPng(logoBytes);
  } catch {
    return null;
  }
}

// Cabeçalho compartilhado pelos relatórios em PDF: logo em tamanho real
// (a arte é quadrada — esticar em "width" bem maior que "height" distorce),
// título + linhas de info à direita, e uma linha fina como divisor em vez de
// uma barra preta sólida (mais limpo, sem competir com o conteúdo).
function drawHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  logo: PDFImage | null,
  title: string,
  infoLines: string[],
) {
  const marginX = 48;
  const marginRight = 595 - 48;
  const logoSize = 34;
  const top = 800;

  if (logo) {
    page.drawImage(logo, {
      x: marginX,
      y: top - logoSize,
      width: logoSize,
      height: logoSize,
    });
  } else {
    page.drawText("UNA", {
      x: marginX,
      y: top - 22,
      size: 16,
      font: fonts.bold,
      color: BRAND,
    });
  }

  const textX = marginX + logoSize + 14;
  page.drawText(title, {
    x: textX,
    y: top - 12,
    size: 15,
    font: fonts.bold,
    color: TEXT_DARK,
  });

  let infoY = top - 27;
  for (const infoLine of infoLines) {
    page.drawText(infoLine.slice(0, 90), {
      x: textX,
      y: infoY,
      size: 9,
      font: fonts.regular,
      color: TEXT_MUTED,
    });
    infoY -= 12;
  }

  // A linha divisória precisa ficar abaixo do que for mais baixo: a logo ou
  // a última linha de info (o cabeçalho às vezes tem 2 linhas, às vezes 3+).
  const ruleY = Math.min(top - logoSize, infoY + 12) - 12;
  page.drawLine({
    start: { x: marginX, y: ruleY },
    end: { x: marginRight, y: ruleY },
    thickness: 1.2,
    color: BRAND,
  });

  return ruleY - 22;
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
  const logo = await embedLogo(pdf);
  let y = 800;

  const draw = (text: string, x = 48, size = 10, font = regular) => {
    page.drawText(text.slice(0, 110), {
      x,
      y,
      size,
      font,
      color: TEXT_DARK,
    });
    y -= size + 8;
  };

  y = drawHeader(page, { regular, bold }, logo, "PEDIDO DE COMPRA", [
    `Numero: ${input.pedidoNumero}`,
    `Data: ${new Date().toLocaleDateString("pt-BR")}`,
  ]);

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

// PDF de PEDIDO de cotação — sem preços, é o que vai pro fornecedor decidir
// quanto cobrar. Não confundir com generatePedidoCompraPdf (o pedido final,
// já com fornecedor escolhido e preços fechados).
export async function generateCotacaoRequestPdf(input: {
  solicitacao: {
    codigo: string | null;
    obra: string | null;
  };
  itens: Array<{
    descricao: string;
    quantidade: number;
    unidade: string;
    observacao?: string | null;
  }>;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);

  // Documento genérico — o mesmo PDF é enviado pra todos os fornecedores
  // escolhidos, sem personalizar por destinatário (só a mensagem do
  // WhatsApp que acompanha o link é personalizada).
  let y = drawHeader(page, { regular, bold }, logo, "SOLICITAÇÃO DE COTAÇÃO", [
    `Solicitação: ${line(input.solicitacao.codigo)}`,
    `Obra: ${line(input.solicitacao.obra)}`,
    `Data: ${new Date().toLocaleDateString("pt-BR")}`,
  ]);

  page.drawText(
    "Por favor, informe valores por item, frete, prazo de entrega e forma de pagamento.",
    { x: 48, y, size: 9, font: regular, color: TEXT_MUTED },
  );
  y -= 22;

  page.drawText("Descricao", { x: 48, y, size: 9, font: bold });
  page.drawText("Qtd", { x: 340, y, size: 9, font: bold });
  page.drawText("Unidade", { x: 390, y, size: 9, font: bold });
  page.drawText("Observacao", { x: 460, y, size: 9, font: bold });
  y -= 18;

  for (const item of input.itens) {
    page.drawText(line(item.descricao).slice(0, 55), {
      x: 48,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(money(item.quantidade), {
      x: 340,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(line(item.unidade, "").slice(0, 12), {
      x: 390,
      y,
      size: 8,
      font: regular,
    });
    page.drawText(line(item.observacao, "").slice(0, 20), {
      x: 460,
      y,
      size: 8,
      font: regular,
    });
    y -= 14;
    if (y < 60) {
      break;
    }
  }

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
    servicos_realizado?: number;
    despesas_realizado?: number;
    tipo?: string | null;
  }>;
}) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);
  let y = 800;

  const renderHeader = () => {
    y = drawHeader(page, { regular, bold }, logo, "ORÇADO x REALIZADO", [
      `Obra: ${line(input.obra.nome)} | Código: ${line(input.obra.codigo)}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ]);
  };

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    renderHeader();
  };

  const ensureSpace = () => {
    if (y < 100) {
      newPage();
    }
  };

  const draw = (text: string, x = 48, size = 10, font = regular) => {
    page.drawText(text.slice(0, 110), {
      x,
      y,
      size,
      font,
      color: TEXT_DARK,
    });
    y -= size + 8;
  };

  renderHeader();

  // Mesma separação Insumos x Mão de Obra da tela de orçamento da obra
  // (obra_orcamento_itens.tipo) — cada item só tem realizado no campo do
  // seu próprio tipo. Caçambas vinculam num item tipo Insumos (escolhido
  // manualmente por caçamba), por isso servicos_realizado entra na seção
  // Insumos, não numa seção própria.
  const insumosItens = input.itens.filter((item) => item.tipo === "insumos");
  const moItens = input.itens.filter((item) => item.tipo === "mao_de_obra");

  // Despesas manuais contribuem pra QUALQUER seção (não é uma 4ª seção à
  // parte) — por isso cada chamada de drawSection soma sua própria chave
  // de realizado + "despesas_realizado". Correto sem double-count: cada
  // linha só entra numa seção (filtro por tipo é mutuamente exclusivo), e
  // despesas_realizado daquela linha já é escopado ao orcamento_item_id dela.
  const drawSection = (
    titulo: string,
    itens: typeof input.itens,
    realizadoKeys: Array<
      | "material_realizado"
      | "mo_realizado"
      | "servicos_realizado"
      | "despesas_realizado"
    >,
  ) => {
    ensureSpace();
    y -= 8;
    draw(titulo, 48, 12, bold);

    page.drawText("Item", { x: 48, y, size: 9, font: bold });
    page.drawText("Orçado", { x: 350, y, size: 9, font: bold });
    page.drawText("Realizado", { x: 460, y, size: 9, font: bold });
    y -= 18;

    let totalOrcado = 0;
    let totalRealizado = 0;

    for (const item of itens) {
      ensureSpace();
      totalOrcado += Number(item.valor_orcado ?? 0);
      const itemRealizado = realizadoKeys.reduce(
        (sum, key) => sum + Number(item[key] ?? 0),
        0,
      );
      totalRealizado += itemRealizado;

      page.drawText(line(item.descricao).slice(0, 55), {
        x: 48,
        y,
        size: 8,
        font: regular,
      });
      page.drawText(`R$ ${money(item.valor_orcado)}`, {
        x: 350,
        y,
        size: 8,
        font: regular,
      });
      page.drawText(`R$ ${money(itemRealizado)}`, {
        x: 460,
        y,
        size: 8,
        font: regular,
      });
      y -= 14;
    }

    if (itens.length === 0) {
      draw("Nenhum item cadastrado.", 48, 8);
    }

    y -= 8;
    draw(
      `Subtotal — Orçado: R$ ${money(totalOrcado)}  |  Realizado: R$ ${money(totalRealizado)}`,
      48,
      9,
      bold,
    );

    return { totalOrcado, totalRealizado };
  };

  const insumosTotals = drawSection("Insumos", insumosItens, [
    "material_realizado",
    "servicos_realizado",
    "despesas_realizado",
  ]);
  const moTotals = drawSection("Mão de Obra", moItens, [
    "mo_realizado",
    "despesas_realizado",
  ]);

  ensureSpace();
  y -= 8;
  draw(
    `Total orçado: R$ ${money(insumosTotals.totalOrcado + moTotals.totalOrcado)}  |  Total realizado: R$ ${money(insumosTotals.totalRealizado + moTotals.totalRealizado)}`,
    48,
    11,
    bold,
  );

  pdf.setTitle(`Orçado x Realizado - ${input.obra.nome}`);

  return pdf.save();
}

export async function generateEstoqueRelatorioPdf(input: {
  filtro: { obraNome: string | null; periodoLabel: string };
  itens: Array<{
    item_nome: string;
    unidade_nome: string | null;
    quantidade_atual: number;
    quantidade_minima: number | null;
  }>;
  entradas: Array<{
    created_at: string;
    quantidade: number;
    motivo?: string | null;
    estoque_item?: { item?: { nome?: string | null } | null } | null;
  }>;
  saidas: Array<{
    created_at: string;
    quantidade: number;
    motivo?: string | null;
    obra?: { nome?: string | null } | null;
    estoque_item?: { item?: { nome?: string | null } | null } | null;
  }>;
}) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);
  let y = 800;

  const renderHeader = () => {
    y = drawHeader(page, { regular, bold }, logo, "RELATÓRIO DE ESTOQUE", [
      `Período: ${input.filtro.periodoLabel}`,
      `Obra (filtro de saídas): ${input.filtro.obraNome ?? "Todas as obras"}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ]);
    page.drawText(
      "Obs.: o filtro por obra aplica-se apenas à seção Saídas — entradas chegam no depósito sem obra vinculada.",
      { x: 48, y, size: 8, font: regular, color: TEXT_MUTED },
    );
    y -= 16;
  };

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    renderHeader();
  };

  const ensureSpace = () => {
    if (y < 100) {
      newPage();
    }
  };

  const draw = (text: string, x = 48, size = 10, font = regular) => {
    page.drawText(text.slice(0, 110), {
      x,
      y,
      size,
      font,
      color: TEXT_DARK,
    });
    y -= size + 8;
  };

  renderHeader();

  ensureSpace();
  y -= 8;
  draw("Itens em estoque", 48, 12, bold);
  page.drawText("Item", { x: 48, y, size: 9, font: bold });
  page.drawText("Unidade", { x: 340, y, size: 9, font: bold });
  page.drawText("Qtd. atual", { x: 440, y, size: 9, font: bold });
  y -= 18;

  for (const item of input.itens) {
    ensureSpace();
    const abaixoDoMinimo =
      item.quantidade_minima != null &&
      Number(item.quantidade_atual) < Number(item.quantidade_minima);
    const color = abaixoDoMinimo ? WARNING : TEXT_DARK;

    page.drawText(line(item.item_nome).slice(0, 55), {
      x: 48,
      y,
      size: 8,
      font: regular,
      color,
    });
    page.drawText(line(item.unidade_nome), {
      x: 340,
      y,
      size: 8,
      font: regular,
      color,
    });
    page.drawText(
      `${Number(item.quantidade_atual).toLocaleString("pt-BR")}${abaixoDoMinimo ? " (abaixo do mínimo)" : ""}`,
      { x: 440, y, size: 8, font: regular, color },
    );
    y -= 14;
  }

  if (input.itens.length === 0) {
    draw("Nenhum item rastreado em estoque.", 48, 8);
  }

  const drawMovimentacoes = (
    titulo: string,
    linhas: typeof input.entradas | typeof input.saidas,
    emptyMessage: string,
    showObra: boolean,
  ) => {
    ensureSpace();
    y -= 16;
    draw(titulo, 48, 12, bold);

    page.drawText("Data", { x: 48, y, size: 9, font: bold });
    page.drawText("Item", { x: 110, y, size: 9, font: bold });
    page.drawText("Qtd.", { x: showObra ? 280 : 350, y, size: 9, font: bold });
    if (showObra) {
      page.drawText("Obra", { x: 330, y, size: 9, font: bold });
    }
    page.drawText("Motivo", { x: 420, y, size: 9, font: bold });
    y -= 18;

    for (const linha of linhas) {
      ensureSpace();
      page.drawText(new Date(linha.created_at).toLocaleDateString("pt-BR"), {
        x: 48,
        y,
        size: 8,
        font: regular,
      });
      page.drawText(line(linha.estoque_item?.item?.nome).slice(0, 30), {
        x: 110,
        y,
        size: 8,
        font: regular,
      });
      page.drawText(Number(linha.quantidade).toLocaleString("pt-BR"), {
        x: showObra ? 280 : 350,
        y,
        size: 8,
        font: regular,
      });
      if (showObra) {
        page.drawText(
          line(
            (linha as { obra?: { nome?: string | null } | null }).obra?.nome,
          ).slice(0, 20),
          { x: 330, y, size: 8, font: regular },
        );
      }
      page.drawText(line(linha.motivo, "").slice(0, 25), {
        x: 420,
        y,
        size: 8,
        font: regular,
      });
      y -= 14;
    }

    if (linhas.length === 0) {
      draw(emptyMessage, 48, 8);
    }
  };

  drawMovimentacoes(
    "Entradas",
    input.entradas,
    "Nenhuma entrada no período.",
    false,
  );
  drawMovimentacoes(
    "Saídas",
    input.saidas,
    "Nenhuma saída no período/obra selecionados.",
    true,
  );

  pdf.setTitle("Relatório de Estoque");

  return pdf.save();
}
