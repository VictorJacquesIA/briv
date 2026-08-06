import { notFound } from "next/navigation";

import { getLinkedObrasForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function listObras(input?: { gestorUserId?: string }) {
  const supabase = await createClient();

  if (input?.gestorUserId) {
    const linkedObraIds = await getLinkedObrasForUser(input.gestorUserId);
    if (linkedObraIds.length === 0) {
      return [];
    }

    const { data } = await supabase
      .from("obras")
      .select(
        "id,nome,codigo,fase,ativo,cliente:clientes(razao_social,nome_fantasia)",
      )
      .in("id", linkedObraIds)
      .order("nome");

    return data ?? [];
  }

  const { data } = await supabase
    .from("obras")
    .select(
      "id,nome,codigo,fase,ativo,cliente:clientes(razao_social,nome_fantasia)",
    )
    .order("nome");

  return data ?? [];
}

export async function getObraDetail(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("obras")
    .select(
      "id,nome,codigo,endereco,fase,ativo,cliente_id,telefone_responsavel,cliente:clientes(id,razao_social,nome_fantasia)",
    )
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }

  return data;
}

export async function listGestoresDisponiveis(clienteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,nome")
    .eq("cliente_id", clienteId)
    .eq("role", "gestor_obra")
    .eq("ativo", true)
    .order("nome");

  return data ?? [];
}

export async function getObraGestor(obraId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("obra_usuarios")
    .select("user_id, profile:profiles(id,nome)")
    .eq("obra_id", obraId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function getOrcamentoRealizado(obraId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_obra_orcamento_realizado")
    .select("*")
    .eq("obra_id", obraId)
    .order("descricao");

  return data ?? [];
}

export async function listDespesasManuais(obraId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("despesas_manuais")
    .select(
      "id,descricao,valor,data_despesa,orcamento_item_id,orcamento_item:obra_orcamento_itens(id,descricao,tipo),profile:profiles(id,nome)",
    )
    .eq("obra_id", obraId)
    .order("data_despesa", { ascending: false });

  return data ?? [];
}
