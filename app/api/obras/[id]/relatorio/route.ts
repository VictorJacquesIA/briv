import { NextResponse } from "next/server";

import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { getObraDetail, getOrcamentoRealizado } from "@/services/obras-service";
import { generateOrcamentoRealizadoPdf } from "@/services/pdf-service";

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
    itens: orcamento,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orcado-realizado-${obra.nome}.pdf"`,
    },
  });
}
