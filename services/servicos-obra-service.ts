import { createClient } from "@/lib/supabase/server";

export async function listCacambas(input?: {
  obraId?: string;
  status?: "solicitada" | "ativa" | "encerrada";
}) {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("cacambas")
    .select(
      "id,tipo,status,acao_pendente,observacao,created_at,obra:obras(id,nome)",
    )
    .order("created_at", { ascending: false });

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function listDesmobilizacoes(input?: {
  obraId?: string;
  status?: "pendente" | "concluida";
}) {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("solicitacoes_desmobilizacao")
    .select(
      "id,data_desmobilizacao,observacao,status,created_at,obra:obras(id,nome)",
    )
    .order("data_desmobilizacao", { ascending: true });

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  return data ?? [];
}
