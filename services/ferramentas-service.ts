import { createClient } from "@/lib/supabase/server";

export async function listFerramentas(input?: {
  status?: "deposito" | "emprestada";
}) {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("ferramentas")
    .select("id,nome,codigo,status,ativo,obra_atual:obras(id,nome)")
    .eq("ativo", true)
    .order("nome");

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function listMovimentacoesFerramenta(ferramentaId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("movimentacoes_ferramentas")
    .select(
      "id,tipo,observacao,created_at,obra:obras(id,nome),responsavel:profiles(nome)",
    )
    .eq("ferramenta_id", ferramentaId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
