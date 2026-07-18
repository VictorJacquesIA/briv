import { notFound } from "next/navigation";

import { getLinkedObrasForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function listObras(input?: { gestorUserId?: string }) {
  const supabase = (await createClient()) as any;

  if (input?.gestorUserId) {
    const linkedObraIds = await getLinkedObrasForUser(input.gestorUserId);
    if (linkedObraIds.length === 0) {
      return [];
    }

    const { data } = await supabase
      .from("obras")
      .select(
        "id,nome,codigo,fase,ativo,cliente:clientes(razao_social,nome_fantasia),responsavel:profiles(nome)",
      )
      .in("id", linkedObraIds)
      .order("nome");

    return data ?? [];
  }

  const { data } = await supabase
    .from("obras")
    .select(
      "id,nome,codigo,fase,ativo,cliente:clientes(razao_social,nome_fantasia),responsavel:profiles(nome)",
    )
    .order("nome");

  return data ?? [];
}

export async function getObraDetail(id: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("obras")
    .select(
      "id,nome,codigo,endereco,fase,ativo,cliente_id,responsavel_id,telefone_responsavel,cliente:clientes(id,razao_social,nome_fantasia),responsavel:profiles(id,nome)",
    )
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }

  return data;
}

export async function getOrcamentoRealizado(obraId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("v_obra_orcamento_realizado")
    .select("*")
    .eq("obra_id", obraId)
    .order("descricao");

  return data ?? [];
}
