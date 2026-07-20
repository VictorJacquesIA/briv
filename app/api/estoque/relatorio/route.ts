import { NextResponse } from "next/server";

import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  listEstoqueSaldo,
  listMovimentacoesEstoque,
} from "@/services/estoque-service";
import {
  buildPdfContentDisposition,
  generateEstoqueRelatorioPdf,
} from "@/services/pdf-service";

export async function GET(request: Request) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "estoque.view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const obraId = url.searchParams.get("obra_id") ?? undefined;
  const obraNome = url.searchParams.get("obra_nome");

  const [itens, entradas, saidas] = await Promise.all([
    listEstoqueSaldo(),
    listMovimentacoesEstoque({ tipo: "entrada", from, to }),
    listMovimentacoesEstoque({ tipo: "saida", from, to, obraId }),
  ]);

  const periodoLabel =
    from && to
      ? `${new Date(from).toLocaleDateString("pt-BR")} a ${new Date(to).toLocaleDateString("pt-BR")}`
      : "Todo o período";

  const pdfBytes = await generateEstoqueRelatorioPdf({
    filtro: { obraNome, periodoLabel },
    itens,
    entradas,
    saidas,
  });

  const rawName = `relatorio-estoque${obraNome ? `-${obraNome}` : ""}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": buildPdfContentDisposition(
        rawName,
        "relatorio-estoque.pdf",
      ),
    },
  });
}
