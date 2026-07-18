import { createClient } from "@/lib/supabase/server";

export async function listLancamentos(input?: {
  obraId?: string;
  status?: string;
}) {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("lancamentos_mo")
    .select(
      "id,tipo,status,valor,qtd_diarias,valor_diaria,orcamento_item_id,vale_aplicado_em,descricao,created_at,confirmado_at,colaborador:colaboradores(id,nome),obra:obras(id,nome)",
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

export async function listColaboradores() {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("colaboradores")
    .select("id,nome,funcao,telefone,ativo")
    .order("nome");

  return data ?? [];
}

export async function getColaboradorSaldo() {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("v_colaborador_saldo")
    .select("*")
    .order("nome");

  return data ?? [];
}
