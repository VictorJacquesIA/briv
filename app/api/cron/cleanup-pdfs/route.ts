import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Mesmo prazo do link (LINK_TTL_SECONDS em purchase-actions.ts) — depois
// desse tempo o link já não abre mesmo, então o arquivo em si pode sumir do
// Storage. Mantido como constante própria porque essa rota não importa
// nada de purchase-actions.ts (evita puxar todo o módulo de compras só por
// uma constante).
const RETENTION_DAYS = 90;

type AdminClient = ReturnType<typeof createAdminClient>;

async function cleanupCotacaoRequestPdfs(
  supabase: AdminClient,
  cutoffIso: string,
) {
  const { data: solicitacoes, error } = await supabase
    .from("solicitacoes")
    .select("id,cotacao_request_pdf_path")
    .not("cotacao_request_pdf_path", "is", null)
    .lt("cotacao_request_pdf_gerado_em", cutoffIso);

  if (error || !solicitacoes || solicitacoes.length === 0) {
    return 0;
  }

  const paths = solicitacoes
    .map((solicitacao) => solicitacao.cotacao_request_pdf_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await supabase.storage.from("anexos").remove(paths);
  }

  await supabase
    .from("solicitacoes")
    .update({
      cotacao_request_pdf_url: null,
      cotacao_request_pdf_path: null,
      cotacao_request_pdf_gerado_em: null,
    })
    .in(
      "id",
      solicitacoes.map((solicitacao) => solicitacao.id),
    );

  return solicitacoes.length;
}

async function cleanupPedidoPdfs(supabase: AdminClient, cutoffIso: string) {
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("id,pdf_path")
    .not("pdf_path", "is", null)
    .lt("emitido_at", cutoffIso);

  if (error || !pedidos || pedidos.length === 0) {
    return 0;
  }

  const paths = pedidos
    .map((pedido) => pedido.pdf_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await supabase.storage.from("pedidos-pdf").remove(paths);
  }

  await supabase
    .from("pedidos")
    .update({ pdf_path: null, pdf_url: null })
    .in(
      "id",
      pedidos.map((pedido) => pedido.id),
    );

  return pedidos.length;
}

// Roda diariamente via Vercel Cron (ver vercel.json). Apaga do Storage os
// PDFs de "pedir cotação" e de "pedido de compra" com mais de
// RETENTION_DAYS, e limpa as colunas de link/path correspondentes — não
// apaga a solicitação/pedido em si, só o arquivo e o link, que de qualquer
// forma já parariam de funcionar depois desse prazo.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const cutoffIso = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [cotacaoPdfsRemovidos, pedidoPdfsRemovidos] = await Promise.all([
    cleanupCotacaoRequestPdfs(supabase, cutoffIso),
    cleanupPedidoPdfs(supabase, cutoffIso),
  ]);

  return NextResponse.json({
    ok: true,
    retention_days: RETENTION_DAYS,
    cotacao_pdfs_removidos: cotacaoPdfsRemovidos,
    pedido_pdfs_removidos: pedidoPdfsRemovidos,
  });
}
