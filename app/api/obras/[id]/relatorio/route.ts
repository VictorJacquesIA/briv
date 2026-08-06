import { NextResponse } from "next/server";

import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { getObraDetail, getOrcamentoRealizado } from "@/services/obras-service";
import {
  buildPdfContentDisposition,
  generateOrcamentoRealizadoPdf,
} from "@/services/pdf-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (
    !hasPermission(currentProfile.role, permissions, "obras.orcamento.view")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [obra, orcamento] = await Promise.all([
    getObraDetail(id),
    getOrcamentoRealizado(id),
  ]);

  const pdfBytes = await generateOrcamentoRealizadoPdf({
    obra: { nome: obra.nome, codigo: obra.codigo },
    itens: orcamento.map((item) => ({
      descricao: item.descricao ?? "-",
      categoria: item.categoria,
      valor_orcado: item.valor_orcado ?? 0,
      material_realizado: item.material_realizado ?? 0,
      mo_realizado: item.mo_realizado ?? 0,
      servicos_realizado: item.servicos_realizado ?? 0,
      despesas_realizado: item.despesas_realizado ?? 0,
      tipo: item.tipo,
    })),
  });

  const rawName = `orcado-realizado-${obra.nome}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": buildPdfContentDisposition(
        rawName,
        "orcado-realizado.pdf",
      ),
    },
  });
}
