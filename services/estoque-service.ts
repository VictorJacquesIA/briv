import { createClient } from "@/lib/supabase/server";

export async function listEstoqueSaldo() {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("v_estoque_saldo")
    .select("*")
    .order("item_nome");

  return data ?? [];
}

export async function getEstoqueDisponivelPorItem(itemIds: string[]) {
  if (itemIds.length === 0) {
    return {} as Record<
      string,
      { estoqueItemId: string; quantidadeAtual: number }
    >;
  }

  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("v_estoque_saldo")
    .select("estoque_item_id,item_id,quantidade_atual")
    .in("item_id", itemIds);

  return (data ?? []).reduce(
    (
      acc: Record<string, { estoqueItemId: string; quantidadeAtual: number }>,
      row: any,
    ) => {
      acc[row.item_id] = {
        estoqueItemId: row.estoque_item_id,
        quantidadeAtual: Number(row.quantidade_atual),
      };
      return acc;
    },
    {},
  );
}

export async function listMovimentacoesEstoque(input?: {
  tipo?: "entrada" | "saida";
  from?: string;
  to?: string;
  obraId?: string;
}) {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("movimentacoes_estoque")
    .select(
      "id,tipo,quantidade,motivo,created_at,obra:obras(id,nome),responsavel:profiles(nome),estoque_item:estoque_itens(item:items(nome,unidade:unidades(nome)))",
    )
    .order("created_at", { ascending: false });

  if (input?.tipo) {
    query = query.eq("tipo", input.tipo);
  }

  if (input?.from) {
    query = query.gte("created_at", input.from);
  }

  if (input?.to) {
    query = query.lte("created_at", input.to);
  }

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function listRequisicoes(input?: { status?: string }) {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("requisicoes_almox")
    .select(
      "id,status,created_at,separado_at,solicitacao:solicitacoes(id,codigo),obra:obras(id,nome)",
    )
    .order("created_at", { ascending: false });

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getRequisicaoDetail(id: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("requisicoes_almox")
    .select(
      `
      *,
      obra:obras(id,nome),
      solicitacao:solicitacoes(id,codigo),
      itens:requisicao_almox_itens(
        id,
        quantidade_solicitada,
        quantidade_separada,
        solicitacao_item:solicitacao_itens(id,descricao,unidade)
      )
      `,
    )
    .eq("id", id)
    .single();

  return data ?? null;
}
