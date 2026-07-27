import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export async function POST(request: Request) {
  const supabase = await createClient();
  const context = await getRequestContext();
  const body = await request.json();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,cliente_id")
    .eq("id", user.id)
    .single();

  if (!profile?.cliente_id) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 403 });
  }

  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: user.id,
    entidade: body.entidade ?? "solicitacao",
    entidadeId: body.entidadeId,
    acao: "whatsapp_enviado",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: {
      tipo_mensagem: body.tipo,
      destinatario: body.destinatario,
      link: body.link,
      data_hora: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
