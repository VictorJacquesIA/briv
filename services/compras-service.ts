import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

  return {
    clientes: clientes ?? [],
    obras: obras ?? [],
    responsaveis: responsaveis ?? [],
    items: items ?? [],
    fornecedores: fornecedores ?? [],
  };
}

export async function listSolicitacoes(input?: {
  search?: string;
  status?: SolicitacaoStatus | "todos";
  page?: number;
  sort?: "created_at" | "prioridade" | "status";
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
    )
    .range(from, to);

  if (input?.status && input.status !== "todos") {
    query = query.eq("status", input.status);
  }

  if (input?.search) {
    query = query.or(
      `codigo.ilike.%${input.search}%,observacao.ilike.%${input.search}%`,
    );
  }

  query = query.order(input?.sort ?? "created_at", { ascending: false });

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
  const itensTotal = (cotacao.itens ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.valor_total ?? 0),
    0,
  );

  return itensTotal + Number(cotacao.frete ?? 0);
}

export function cotacaoPendencias(cotacao: any) {
  const pendencias: string[] = [];

  if (cotacao.frete === null || cotacao.frete === undefined) {
    pendencias.push("frete ausente");
  }

  if (cotacao.prazo_dias === null || cotacao.prazo_dias === undefined) {
    pendencias.push("prazo ausente");
  }

  if (!cotacao.forma_pagamento) {
    pendencias.push("forma de pagamento ausente");
  }

  const hasNaoCotado = (cotacao.itens ?? []).some(
    (item: any) => item.item_nao_cotado,
  );

  if (hasNaoCotado) {
    pendencias.push("item não cotado");
  }

  return pendencias;
}

export async function getPurchaseStatusCounts(input?: {
  responsavelObraId?: string;
}) {
  const supabase = await createClient();
  const statuses: SolicitacaoStatus[] = [
    "aberta",
    "em_cotacao",
    "aguardando_aprovacao",
    "pedido_enviado",
    "finalizada",
  ];
  const counts = await Promise.all(
    statuses.map((status) => {
      let query = supabase
        .from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .eq("status", status);

      if (input?.responsavelObraId) {
        query = query.eq("responsavel_obra_id", input.responsavelObraId);
      }

      return query;
    }),
  );

  return {
    abertas: counts[0].count ?? 0,
    emCotacao: counts[1].count ?? 0,
    aguardandoAprovacao: counts[2].count ?? 0,
    pedidosEnviados: counts[3].count ?? 0,
    finalizadas: counts[4].count ?? 0,
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
