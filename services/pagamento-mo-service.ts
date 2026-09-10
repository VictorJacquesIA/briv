import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function listLancamentos(input?: {
  obraId?: string;
  colaboradorId?: string;
  status?: Database["public"]["Enums"]["lancamento_mo_status"];
}) {
  const supabase = await createClient();
  let query = supabase
    .from("lancamentos_mo")
    .select(
      "id,tipo,status,valor,qtd_diarias,valor_diaria,orcamento_item_id,vale_aplicado_em,descricao,created_at,confirmado_at,colaborador:colaboradores(id,nome,chave_pix,dados_bancarios),obra:obras(id,nome)",
    )
    .order("created_at", { ascending: false });

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  if (input?.colaboradorId) {
    query = query.eq("colaborador_id", input.colaboradorId);
  }

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data } = await query.limit(200);
  return data ?? [];
}

export async function listColaboradores() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select("id,nome,funcao,telefone,chave_pix,valor_diaria,observacao,ativo")
    .order("nome");

  return data ?? [];
}

export async function getColaborador(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select(
      "id,nome,funcao,telefone,chave_pix,dados_bancarios,valor_diaria,observacao,ativo",
    )
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}

export async function getColaboradorSaldo() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_colaborador_saldo")
    .select("*")
    .order("nome");

  return data ?? [];
}

export async function listContratos(input?: {
  obraId?: string;
  status?: Database["public"]["Enums"]["contrato_mo_status"];
}) {
  const supabase = await createClient();
  let query = supabase
    .from("v_contrato_mo_saldo")
    .select("*")
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

export async function getContrato(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_contrato_mo_saldo")
    .select("*")
    .eq("contrato_id", id)
    .maybeSingle();

  return data ?? null;
}
