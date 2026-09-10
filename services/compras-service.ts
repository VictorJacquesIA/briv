import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getEstoqueDisponivelPorItem } from "@/services/estoque-service";
import { listHistoricoPorEntidade } from "@/services/historico-service";
import type { Database } from "@/types/database";

type SolicitacaoStatus = Database["public"]["Enums"]["solicitacao_status"];

export const statusLabels: Record<string, string> = {
  rascunho: "Nova Solicitação",
  aberta: "Nova Solicitação",
  em_cotacao: "Em Cotação",
  cotacao_recebida: "Cotação Recebida",
  validado: "Validado",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovacao: "Aguardando Aprovação",
  pdf_gerado: "PDF Gerado",
  pedido_programado: "Pedido Programado",
  pedido_enviado: "Pedido Enviado",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  rejeitada: "Recusada",
};

export const purchaseFlow = [
  "Nova Solicitação",
  "Em Cotação",
  "Cotação Recebida",
  "Validado",
  "Aguardando Aprovação",
  "PDF Gerado",
  "Pedido Programado",
  "Pedido Enviado",
  "Finalizada",
  "Cancelada",
];

export const STATUSES_AGUARDANDO_COTACAO = ["aberta", "rascunho"];
export const STATUSES_EM_COTACAO = ["em_cotacao", "cotacao_recebida"];
export const STATUSES_AGUARDANDO_APROVACAO = [
  "validado",
  "aguardando_aprovacao",
  "aprovacao",
];
export const STATUSES_TERMINAIS = ["finalizada", "cancelada"];

// Visão simplificada pra tela de listagem (/compras) — o operador vê só 4
// etapas do fluxo normal + os 2 desfechos negativos, em vez dos ~14 status
// internos que só importam mesmo na tela de detalhe (onde as ações
// disponíveis dependem da etapa exata).
export const STATUS_GROUPS: Record<string, SolicitacaoStatus[]> = {
  nova_solicitacao: ["rascunho", "aberta"],
  em_cotacao: [
    "em_cotacao",
    "cotacao_recebida",
    "validado",
    "aguardando_aprovacao",
    "aprovacao",
  ],
  pedido_aprovado: [
    "aprovada",
    "autorizada",
    "pdf_gerado",
    "pedido_programado",
  ],
  finalizado: ["pedido_enviado", "finalizada"],
  cancelada: ["cancelada"],
  rejeitada: ["rejeitada"],
};

export const STATUS_GROUP_LABELS: Record<string, string> = {
  nova_solicitacao: "Nova Solicitação",
  em_cotacao: "Em Cotação",
  pedido_aprovado: "Pedido Aprovado",
  finalizado: "Finalizado",
  cancelada: "Cancelada",
  rejeitada: "Recusada",
};

const STATUS_TO_GROUP: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_GROUPS).flatMap(([group, statuses]) =>
    statuses.map((status) => [status, group]),
  ),
);

export function statusGroupLabel(status: string) {
  const group = STATUS_TO_GROUP[status];
  return group ? STATUS_GROUP_LABELS[group] : status;
}

// Prefixado ("grupo-...") pra nunca colidir com uma chave de status bruto
// em statusClasses (components/ui/status-badge.tsx) — a tela de detalhe usa
// o status exato pra cor, a listagem usa o grupo, e os dois precisam poder
// ter cores diferentes pro mesmo status interno sem se atropelar.
export function statusGroupKey(status: string) {
  return `grupo-${STATUS_TO_GROUP[status] ?? status}`;
}

export async function getPurchaseFormOptions() {
  const supabase = await createClient();
  const [
    { data: clientes },
    { data: obras },
    { data: responsaveis },
    { data: items },
    { data: fornecedores },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("id,razao_social,nome_fantasia")
      .eq("ativo", true),
    supabase
      .from("obras")
      .select("id,nome,cliente_id")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("profiles")
      .select("id,nome,role,cliente_id")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("items")
      .select("id,nome,unidade_id,unidade:unidades(id,nome)")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("fornecedores")
      .select(
        "id,razao_social,nome_fantasia,cliente_id,mensagem_template,whatsapp,telefone",
      )
      .eq("ativo", true)
      .order("razao_social"),
  ]);

  const estoquePorItem = await getEstoqueDisponivelPorItem(
    (items ?? []).map((item) => item.id),
  );

  return {
    clientes: clientes ?? [],
    obras: obras ?? [],
    responsaveis: responsaveis ?? [],
    items: (items ?? []).map((item) => ({
      ...item,
      estoqueAtual: estoquePorItem[item.id]?.quantidadeAtual ?? 0,
    })),
    fornecedores: fornecedores ?? [],
  };
}

export async function listSolicitacoes(input?: {
  search?: string;
  status?: keyof typeof STATUS_GROUPS | "todos";
  page?: number;
  sort?: "created_at" | "prioridade" | "status";
  obraId?: string;
}) {
  const supabase = await createClient();
  const page = Math.max(input?.page ?? 1, 1);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("solicitacoes")
    .select(
      "id,codigo,status,prioridade,created_at,obra:obras(nome),cliente:clientes(razao_social),solicitante:profiles!solicitacoes_solicitante_id_fkey(nome)",
      { count: "exact" },
    );

  // Chamada pelo hub da obra (obraId, sem paginação de UI): traz o
  // histórico inteiro daquela obra em vez de só a 1ª página de 10.
  query = input?.obraId ? query.limit(200) : query.range(from, to);

  if (input?.obraId) {
    query = query.eq("obra_id", input.obraId);
  }

  if (input?.status && input.status !== "todos") {
    const statuses = STATUS_GROUPS[input.status];
    if (statuses) {
      query = query.in("status", statuses);
    }
  } else if (!input?.search && !input?.obraId) {
    // Visão "solta" (sem filtro de status nem busca): Finalizado fica de
    // fora, tipo arquivado — senão a lista enche de pedidos já concluídos.
    // Ainda dá pra achar filtrando por "Finalizado" ou buscando por
    // código/observação. Com obraId (hub da obra) não arquiva nada — ali é
    // o histórico completo daquela obra, finalizado incluído.
    query = query.not(
      "status",
      "in",
      `(${STATUS_GROUPS.finalizado.join(",")})`,
    );
  }

  if (input?.search) {
    // Valor entre aspas duplas neutraliza vírgula/parênteses no filtro do
    // PostgREST (senão dá pra reescrever a expressão .or() inteira); "\" e
    // '"' embutidos são escapados pra não fechar a string antes da hora.
    const safeSearch = input.search.replace(/["\\]/g, (c) => `\\${c}`);
    const orParts = [
      `codigo.ilike."%${safeSearch}%"`,
      `observacao.ilike."%${safeSearch}%"`,
    ];

    // Busca por nome de obra: como "obra" é uma tabela relacionada (join),
    // o .or() abaixo não filtra direto por obra.nome — resolve os IDs das
    // obras que batem com o termo primeiro e inclui via obra_id.in(...).
    const { data: obrasEncontradas } = await supabase
      .from("obras")
      .select("id")
      .ilike("nome", `%${input.search}%`);
    const obraIds = (obrasEncontradas ?? []).map((obra: any) => obra.id);

    if (obraIds.length > 0) {
      orParts.push(`obra_id.in.(${obraIds.join(",")})`);
    }

    query = query.or(orParts.join(","));
  }

  const allowedSorts = ["created_at", "prioridade", "status"] as const;
  const sort = allowedSorts.includes(
    input?.sort as (typeof allowedSorts)[number],
  )
    ? (input!.sort as (typeof allowedSorts)[number])
    : "created_at";
  query = query.order(sort, { ascending: false });

  const { data, count } = await query;

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSolicitacaoDetail(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitacoes")
    .select(
      `
      *,
      cliente:clientes(*),
      obra:obras(*),
      solicitante:profiles!solicitacoes_solicitante_id_fkey(id,nome,role),
      responsavel_obra:profiles!solicitacoes_responsavel_obra_id_fkey(id,nome,role,telefone,whatsapp),
      fornecedor_aprovado:fornecedores!solicitacoes_fornecedor_aprovado_id_fkey(id,razao_social,nome_fantasia),
      itens:solicitacao_itens(*),
      anexos:solicitacao_anexos(*),
      cotacoes:cotacoes(*, fornecedor:fornecedores(*), itens:cotacao_itens(*)),
      aprovacoes:aprovacoes(*, aprovador:profiles(id,nome)),
      pedidos:pedidos(*, fornecedor:fornecedores(*))
      `,
    )
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }

  const historico = await listHistoricoPorEntidade("solicitacao", id);

  return { ...data, historico };
}

export async function getPublicApprovalByToken(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("solicitacoes")
    .select(
      `
      *,
      cliente:clientes(*),
      obra:obras(*),
      itens:solicitacao_itens(*),
      cotacoes:cotacoes(*, fornecedor:fornecedores(*), itens:cotacao_itens(*))
      `,
    )
    .eq("aprovacao_token", token)
    .in("status", ["aguardando_aprovacao", "aprovacao"])
    .gt("aprovacao_token_expires_at", new Date().toISOString())
    .single();

  if (!data) {
    notFound();
  }

  return data;
}

export function fornecedorTotal(cotacao: any) {
  return (cotacao.itens ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.valor_total ?? 0),
    0,
  );
}

export function cotacaoPendencias(cotacao: any) {
  const pendencias: string[] = [];

  const hasNaoCotado = (cotacao.itens ?? []).some(
    (item: any) => item.item_nao_cotado,
  );

  if (hasNaoCotado) {
    pendencias.push("item não cotado");
  }

  return pendencias;
}

// Mesmos 4 grupos da listagem (/compras) — o dashboard precisa bater com o
// que a tela de Compras mostra, em vez de contar só um status exato de cada
// vez (o que deixava vários status internos fora de qualquer indicador).
const DASHBOARD_STATUS_GROUPS = [
  "nova_solicitacao",
  "em_cotacao",
  "pedido_aprovado",
  "finalizado",
] as const;

export async function getPurchaseStatusCounts(input?: {
  responsavelObraId?: string;
}) {
  const supabase = await createClient();
  const counts = await Promise.all(
    DASHBOARD_STATUS_GROUPS.map((group) => {
      let query = supabase
        .from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .in("status", STATUS_GROUPS[group]);

      if (input?.responsavelObraId) {
        query = query.eq("responsavel_obra_id", input.responsavelObraId);
      }

      return query;
    }),
  );

  return {
    novaSolicitacao: counts[0].count ?? 0,
    emCotacao: counts[1].count ?? 0,
    pedidoAprovado: counts[2].count ?? 0,
    finalizado: counts[3].count ?? 0,
  };
}

export async function listUnits() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unidades")
    .select("id,nome")
    .eq("ativo", true)
    .order("nome");

  return data ?? [];
}

export async function listItems() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("id,nome,unidade_id")
    .eq("ativo", true)
    .order("nome");

  return data ?? [];
}

export async function searchItems(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("id,nome,unidade_id,unidade:unidades(id,nome)")
    .eq("ativo", true)
    .ilike("nome", `%${trimmed}%`)
    .order("nome")
    .limit(20);

  return data ?? [];
}
