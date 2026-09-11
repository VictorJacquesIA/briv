import { NextResponse } from "next/server";

import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { listFerramentas } from "@/services/ferramentas-service";
import {
  buildPdfContentDisposition,
  generateFerramentasLocadasPdf,
} from "@/services/pdf-service";
import { getCurrentProfile } from "@/services/profiles-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "ferramentas.view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const fornecedorId = url.searchParams.get("fornecedor_id");

  if (!fornecedorId) {
    return NextResponse.json(
      { error: "fornecedor_id obrigatório" },
      { status: 400 },
    );
  }

  const ferramentas = await listFerramentas({
    status: "locada",
    fornecedorId,
  });

  const fornecedorNome =
    ferramentas[0]?.fornecedor?.nome_fantasia ??
    ferramentas[0]?.fornecedor?.razao_social ??
    "Fornecedor";

  const pdfBytes = await generateFerramentasLocadasPdf({
    fornecedorNome,
    itens: ferramentas.map((ferramenta: any) => ({
      nome: ferramenta.nome,
      codigo: ferramenta.codigo,
      obraNome: ferramenta.obra_atual?.nome ?? null,
      valor_locacao: ferramenta.valor_locacao,
      entregue_em: ferramenta.entregue_em,
      data_prevista_devolucao: ferramenta.data_prevista_devolucao,
    })),
  });

  const rawName = `ferramentas-locadas-${fornecedorNome}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": buildPdfContentDisposition(
        rawName,
        "ferramentas-locadas.pdf",
      ),
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
