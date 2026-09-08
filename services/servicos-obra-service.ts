import { createClient } from "@/lib/supabase/server";

export async function listCacambas(input?: {
  obraId?: string;
  status?: "pendente" | "solicitada" | "ativa" | "encerrada";
  pendente?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("cacambas")
    .select(
      "id,tipo,status,acao_pendente,observacao,valor,created_at,mensagem_enviada_em,data_prevista,obra:obras(id,nome,endereco),orcamento_item:obra_orcamento_itens(id,descricao),fornecedor:fornecedores(id,razao_social,nome_fantasia,whatsapp,telefone)",
    )
    .order("created_at", { ascending: false });

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  if (input?.pendente) {
    // "Precisa de atenção": ainda não avisou o fornecedor (pendente), já
    // avisou e aguarda entrega (solicitada), ou tem troca/devolução em
    // aberto — não inclui ativa sem pendência nem encerrada.
    query = query.or(
      "status.eq.pendente,status.eq.solicitada,acao_pendente.not.is.null",
    );
  }

  const { data } = await query;
  return data ?? [];
}

// Caçambas com a ação atual (mensagem ainda não enviada, entrega, troca ou
// devolução) vencida — data_prevista já chegou e ainda não foi resolvida.
// Usado pro popup de lembrete que aparece no login do gestor e do compras.
// "pendente" entra aqui também: se o compras esquecer de mandar a
// mensagem pro fornecedor, a data vencida tem que aparecer do mesmo jeito,
// não só depois que a mensagem já foi enviada.
export async function listCacambasVencidas(input?: { obraIds?: string[] }) {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("cacambas")
    .select(
      "id,tipo,status,acao_pendente,observacao,data_prevista,fornecedor_id,obra:obras(id,nome,endereco)",
    )
    .lte("data_prevista", hoje)
    .or("status.eq.pendente,status.eq.solicitada,acao_pendente.not.is.null")
    .order("data_prevista", { ascending: true });

  if (input?.obraIds) {
    if (input.obraIds.length === 0) {
      return [];
    }
    query = query.in("obra_id", input.obraIds);
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
