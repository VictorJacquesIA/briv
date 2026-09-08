import { createClient } from "@/lib/supabase/server";

export async function listFerramentas(input?: {
  status?: "deposito" | "emprestada" | "locada";
}) {
  const supabase = await createClient();
  let query = supabase
    .from("ferramentas")
    .select(
      "id,nome,codigo,status,ativo,fornecedor_id,valor_locacao,data_prevista_devolucao,mensagem_enviada_em,entregue_em,obra_atual:obras(id,nome),fornecedor:fornecedores(id,razao_social,nome_fantasia,whatsapp,telefone)",
    )
    .eq("ativo", true)
    .order("nome");

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function listMovimentacoesFerramenta(ferramentaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("movimentacoes_ferramentas")
    .select(
      "id,tipo,observacao,created_at,obra:obras(id,nome),responsavel:profiles(nome)",
    )
    .eq("ferramenta_id", ferramentaId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function listFerramentaSolicitacoes(input?: {
  obraIds?: string[];
  status?: "pendente" | "atendida" | "cancelada";
}) {
  const supabase = await createClient();
  let query = supabase
    .from("ferramenta_solicitacoes")
    .select(
      "id,descricao,observacao,status,decisao,data_necessidade,periodo_uso,fornecedor_id,mensagem_enviada_em,created_at,atendido_at,obra:obras(id,nome,endereco),ferramenta:ferramentas(id,nome,status,fornecedor_id,valor_locacao,data_prevista_devolucao,mensagem_enviada_em,entregue_em,fornecedor:fornecedores(id,razao_social,nome_fantasia,whatsapp,telefone))",
    )
    .order("created_at", { ascending: false });

  if (input?.obraIds) {
    if (input.obraIds.length === 0) {
      return [];
    }
    query = query.in("obra_id", input.obraIds);
  }

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  return data ?? [];
}

// Ferramentas locadas com ação vencida (mensagem não enviada ou devolução
// atrasada) — usado no popup de lembrete no login, mesma lógica da caçamba.
export async function listFerramentasLocadasVencidas(input?: {
  obraIds?: string[];
}) {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("ferramentas")
    .select(
      "id,nome,data_prevista_devolucao,mensagem_enviada_em,entregue_em,obra_atual:obras(id,nome)",
    )
    .eq("status", "locada")
    .eq("ativo", true)
    .or(
      `mensagem_enviada_em.is.null,and(data_prevista_devolucao.lte.${hoje},entregue_em.not.is.null)`,
    );

  if (input?.obraIds) {
    if (input.obraIds.length === 0) {
      return [];
    }
    query = query.in("obra_atual_id", input.obraIds);
  }

  const { data } = await query;
  return data ?? [];
}
