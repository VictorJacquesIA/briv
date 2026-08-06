import { createClient } from "@/lib/supabase/server";

export async function listCacambas(input?: {
  obraId?: string;
  status?: "solicitada" | "ativa" | "encerrada";
  pendente?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("cacambas")
    .select(
      "id,tipo,status,acao_pendente,observacao,valor,created_at,obra:obras(id,nome),orcamento_item:obra_orcamento_itens(id,descricao)",
    )
    .order("created_at", { ascending: false });

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  if (input?.pendente) {
    query = query.or("status.eq.solicitada,acao_pendente.eq.true");
  }

  const { data } = await query;
  return data ?? [];
}

export async function listDesmobilizacoes(input?: {
  obraId?: string;
  status?: "pendente" | "concluida";
}) {
  const supabase = await createClient();
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

  const { data } = await query.limit(200);
  return data ?? [];
}
