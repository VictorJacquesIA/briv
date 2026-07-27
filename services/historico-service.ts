import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function registrarHistorico(input: {
  clienteId: string;
  actorId?: string | null;
  entidade: string;
  entidadeId: string;
  acao: string;
  statusAnterior?: string | null;
  statusNovo?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  dados?: Json;
}) {
  const supabase = await createClient();

  await supabase.from("historico").insert({
    cliente_id: input.clienteId,
    actor_id: input.actorId ?? null,
    entidade: input.entidade,
    entidade_id: input.entidadeId,
    acao: input.acao,
    status_anterior: input.statusAnterior ?? null,
    status_novo: input.statusNovo ?? null,
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
    dados: input.dados ?? {},
  });
}

export async function listHistoricoPorEntidade(
  entidade: string,
  entidadeId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("historico")
    .select(
      "id,acao,entidade,entidade_id,created_at,status_anterior,status_novo,dados",
    )
    .eq("entidade", entidade)
    .eq("entidade_id", entidadeId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function listHistorico(input?: {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  entidades?: string[];
}) {
  const supabase = await createClient();
  const page = Math.max(input?.page ?? 1, 1);
  const pageSize = input?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("historico")
    .select(
      "id,acao,entidade,entidade_id,created_at,status_anterior,status_novo,dados",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (input?.from) {
    query = query.gte("created_at", input.from);
  }

  if (input?.to) {
    query = query.lte("created_at", input.to);
  }

  if (input?.entidades && input.entidades.length > 0) {
    query = query.in("entidade", input.entidades);
  }

  const { data, count } = await query;

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  };
}
