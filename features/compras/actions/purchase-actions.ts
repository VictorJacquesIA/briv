"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { money, text } from "@/lib/form-data";
import {
  assertPermission,
  getLinkedObrasForUser,
  getPermissionsForUser,
  isGestorRole,
  normalizeRole,
} from "@/lib/permissions";
import { registrarHistorico } from "@/services/historico-service";
import {
  generateCotacaoRequestPdf,
  generatePedidoCompraPdf,
} from "@/services/pdf-service";
import { getRequestContext } from "@/services/request-context";
import {
  extractCotacaoFromFile,
  type CotacaoExtraction,
} from "@/services/ai-extraction-service";
import { getEstoqueDisponivelPorItem } from "@/services/estoque-service";
import {
  STATUSES_AGUARDANDO_COTACAO,
  STATUSES_EM_COTACAO,
} from "@/services/compras-service";
import {
  createShortLink,
  createShortLinkWithClient,
} from "@/services/short-link-service";
import type { Database } from "@/types/database";

type ActionState = {
  message?: string;
  approvalUrl?: string;
};

// Validade dos links compartilhados por WhatsApp/e-mail (aprovação e PDFs
// de cotação/pedido). Os PDFs de cotação/pedido também são apagados do
// Storage depois desse prazo pela limpeza automática (ver
// app/api/cron/cleanup-pdfs/route.ts) — os dois têm que ficar iguais, senão
// o link fica "vivo" apontando pra um arquivo que já não existe mais.
const LINK_TTL_SECONDS = 60 * 60 * 24 * 90;

type PrioridadeSolicitacao =
  Database["public"]["Enums"]["prioridade_solicitacao"];
type SolicitacaoStatus = Database["public"]["Enums"]["solicitacao_status"];

const PRIORIDADE_VALUES: PrioridadeSolicitacao[] = [
  "baixa",
  "normal",
  "alta",
  "urgente",
];

function isPrioridadeSolicitacao(
  value: string,
): value is PrioridadeSolicitacao {
  return (PRIORIDADE_VALUES as string[]).includes(value);
}

type PedidoLocalEntrega = Database["public"]["Enums"]["pedido_local_entrega"];

const PEDIDO_LOCAL_ENTREGA_VALUES: PedidoLocalEntrega[] = [
  "obra",
  "deposito",
  "retirada",
];

function isPedidoLocalEntrega(
  value: string | null,
): value is PedidoLocalEntrega {
  return !!value && (PEDIDO_LOCAL_ENTREGA_VALUES as string[]).includes(value);
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessao expirada.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,cliente_id,nome,role,ativo")
    .eq("id", user.id)
    .single();

  if (!profile || profile.ativo === false) {
    throw new Error("Usuario inativo.");
  }

  const clienteId = profile.cliente_id;

  if (!clienteId) {
    throw new Error("Perfil sem cliente vinculado.");
  }

  return {
    supabase,
    user,
    profile: {
      ...profile,
      cliente_id: clienteId,
      role: normalizeRole(profile.role),
    },
  };
}

type CotacaoItemInput = {
  solicitacao_item_id: string;
  preco_unitario: number | null;
  valor_total: number;
  item_nao_cotado: boolean;
  observacao: string | null;
};

function parseCotacaoItens(formData: FormData): CotacaoItemInput[] {
  const itemIndexes = Array.from({ length: 50 }, (_, index) => index);

  return itemIndexes
    .map((index): CotacaoItemInput | null => {
      const itemId = text(
        formData,
        `cotacao_item_${index}_solicitacao_item_id`,
      );

      if (!itemId) {
        return null;
      }

      // Permite dividir a cotação por fornecedor: um item desmarcado em
      // "Incluir" (CotacaoForm) não entra nesta cotação — o fornecedor pode
      // não cotar tudo da solicitação (ex: elétrica x tinta). No fluxo de
      // revisão de upload (CotacaoReviewForm) o campo vem sempre "on" via
      // hidden input, já que os itens ali já chegam pré-filtrados pela
      // seleção feita no upload.
      const incluido = formData.get(`cotacao_item_${index}_incluir`) === "on";

      if (!incluido) {
        return null;
      }

      const naoCotado =
        formData.get(`cotacao_item_${index}_nao_cotado`) === "on";
      const quantidade =
        money(formData.get(`cotacao_item_${index}_quantidade`)) ?? 0;
      const valorUnitario = naoCotado
        ? null
        : money(formData.get(`cotacao_item_${index}_valor_unitario`));
      const valorTotal = naoCotado
        ? 0
        : Number((quantidade * (valorUnitario ?? 0)).toFixed(2));

      return {
        solicitacao_item_id: itemId,
        preco_unitario: valorUnitario,
        valor_total: valorTotal,
        item_nao_cotado: naoCotado,
        observacao: text(formData, `cotacao_item_${index}_observacao`),
      };
    })
    .filter((item): item is CotacaoItemInput => item !== null);
}

// Item incluído e não marcado "não cotado" mas sem preço (>0) some
// silenciosamente do orçamento do fornecedor com valor_total = 0 — quase
// sempre é erro de digitação (ex: preencheu o campo errado). Bloqueia o
// salvamento em vez de aceitar um item cotado a R$0,00 sem avisar ninguém.
function itensSemPreco(itens: CotacaoItemInput[]) {
  return itens.filter(
    (item) =>
      !item.item_nao_cotado &&
      !(item.preco_unitario && item.preco_unitario > 0),
  );
}

function calcularTotalFornecedor(itens: CotacaoItemInput[]) {
  const totalItens = itens.reduce(
    (sum, item) => sum + Number(item.valor_total ?? 0),
    0,
  );
  return Number(totalItens.toFixed(2));
}

// Desconto negociado com o fornecedor depois de cotado — reduz preço
// unitário e total de cada item na mesma proporção, mantendo os dois
// consistentes entre si (mesma lógica usada pra reconciliar a cotação da
// Cassol manualmente, agora automática).
function aplicarDesconto(
  itens: CotacaoItemInput[],
  descontoPercentual: number,
): CotacaoItemInput[] {
  if (!descontoPercentual) {
    return itens;
  }

  const fator = 1 - descontoPercentual / 100;

  return itens.map((item) => {
    if (item.item_nao_cotado || item.preco_unitario == null) {
      return item;
    }

    return {
      ...item,
      preco_unitario: Number((item.preco_unitario * fator).toFixed(4)),
      valor_total: Number((item.valor_total * fator).toFixed(2)),
    };
  });
}

export async function createSolicitacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "solicitacoes.create");
    const context = await getRequestContext();
    const isGestor = isGestorRole(profile.role);
    const clienteId = isGestor
      ? profile.cliente_id
      : (text(formData, "cliente_id") ?? profile.cliente_id);
    const obraId = text(formData, "obra_id");
    const responsavelObraId = text(formData, "responsavel_obra_id");

    if (!obraId || !responsavelObraId) {
      return { message: "Informe obra e responsavel da obra." };
    }

    let finalResponsavelObraId = responsavelObraId;

    if (isGestor) {
      const linkedObras = await getLinkedObrasForUser(profile.id);
      if (!linkedObras.includes(obraId)) {
        return {
          message:
            "Você não tem permissão para criar solicitações para esta obra.",
        };
      }
      finalResponsavelObraId = profile.id;
    }

    const files = formData
      .getAll("anexos")
      .filter((file) => file instanceof File) as File[];
    const validFiles = files.filter((file) => file.size > 0);

    if (isGestor && validFiles.length > 2) {
      return { message: "Envie no máximo 2 fotos." };
    }

    const prioridadeInput = text(formData, "prioridade");
    const prioridade: PrioridadeSolicitacao =
      prioridadeInput && isPrioridadeSolicitacao(prioridadeInput)
        ? prioridadeInput
        : "normal";

    const codigo = `SC-${Date.now().toString(36).toUpperCase()}`;
    const { data: solicitacao, error } = await supabase
      .from("solicitacoes")
      .insert({
        cliente_id: clienteId,
        obra_id: obraId,
        solicitante_id: user.id,
        responsavel_obra_id: finalResponsavelObraId,
        prioridade,
        observacao: text(formData, "observacao"),
        data_necessidade: text(formData, "data_necessidade"),
        status: "aberta",
        codigo,
      })
      .select("id,cliente_id")
      .single();

    if (error || !solicitacao) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível criar a solicitação.",
        ),
      };
    }

    type SolicitacaoItemInput = {
      solicitacao_id: string;
      item_id: string | null;
      orcamento_item_id: string | null;
      descricao: string;
      quantidade: number;
      unidade: string;
      observacao: string | null;
    };

    const itens = Array.from({ length: 10 })
      .map((_, index): SolicitacaoItemInput | null => {
        const descricao = text(formData, `item_${index}_descricao`);
        const quantidade = money(formData.get(`item_${index}_quantidade`));
        const unidade = text(formData, `item_${index}_unidade`);

        if (!descricao || !quantidade || !unidade) {
          return null;
        }

        return {
          solicitacao_id: solicitacao.id,
          item_id: text(formData, `item_${index}_item_id`),
          orcamento_item_id: text(formData, `item_${index}_orcamento_item_id`),
          descricao,
          quantidade,
          unidade,
          observacao: text(formData, `item_${index}_observacao`),
        };
      })
      .filter((item): item is SolicitacaoItemInput => item !== null);

    if (itens.length === 0) {
      return { message: "Inclua ao menos um material." };
    }

    const { error: itensError } = await supabase
      .from("solicitacao_itens")
      .insert(itens);

    if (itensError) {
      return {
        message: friendlyErrorMessage(
          itensError,
          "Não foi possível salvar os itens da solicitação.",
        ),
      };
    }

    for (const file of validFiles) {
      const storagePath = `${clienteId}/${solicitacao.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("anexos")
        .upload(storagePath, file, { upsert: false });

      if (!uploadError) {
        await supabase.from("solicitacao_anexos").insert({
          cliente_id: clienteId,
          solicitacao_id: solicitacao.id,
          nome_arquivo: file.name,
          storage_path: storagePath,
          content_type: file.type || null,
          tamanho_bytes: file.size,
          uploaded_by: user.id,
        });
      }
    }

    await registrarHistorico({
      clienteId,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacao.id,
      acao: "solicitacao_criada",
      statusAnterior: null,
      statusNovo: "aberta",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { codigo, prioridade: text(formData, "prioridade") ?? "normal" },
    });

    revalidatePath("/compras");
    redirect(`/compras/${solicitacao.id}`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    return {
      message: friendlyErrorMessage(error),
    };
  }
}

// Edição pós-criação: só enquanto a solicitação ainda está em "Nova
// Solicitação" (rascunho/aberta — antes de entrar em cotação). O gestor que
// criou só edita a própria solicitação; compras/adm_geral (não-gestor) pode
// editar qualquer uma nessa etapa, como já fazem com o resto do fluxo.
export async function editarSolicitacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "solicitacoes.edit");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");

    if (!solicitacaoId) {
      return { message: "Dados inválidos." };
    }

    const { data: current } = await supabase
      .from("solicitacoes")
      .select("id,status,solicitante_id")
      .eq("id", solicitacaoId)
      .single();

    if (!current) {
      return { message: "Solicitação não encontrada." };
    }

    if (!STATUSES_AGUARDANDO_COTACAO.includes(current.status)) {
      return {
        message:
          "Só é possível editar enquanto a solicitação estiver em Nova Solicitação.",
      };
    }

    if (isGestorRole(profile.role) && current.solicitante_id !== profile.id) {
      return {
        message: "Você só pode editar solicitações que você mesmo criou.",
      };
    }

    const prioridadeInput = text(formData, "prioridade");
    const prioridade: PrioridadeSolicitacao =
      prioridadeInput && isPrioridadeSolicitacao(prioridadeInput)
        ? prioridadeInput
        : "normal";

    type SolicitacaoItemInput = {
      id: string | null;
      item_id: string | null;
      descricao: string;
      quantidade: number;
      unidade: string;
      observacao: string | null;
    };

    const itens = Array.from({ length: 10 })
      .map((_, index): SolicitacaoItemInput | null => {
        const descricao = text(formData, `item_${index}_descricao`);
        const quantidade = money(formData.get(`item_${index}_quantidade`));
        const unidade = text(formData, `item_${index}_unidade`);

        if (!descricao || !quantidade || !unidade) {
          return null;
        }

        return {
          id: text(formData, `item_${index}_id`),
          item_id: text(formData, `item_${index}_item_id`),
          descricao,
          quantidade,
          unidade,
          observacao: text(formData, `item_${index}_observacao`),
        };
      })
      .filter((item): item is SolicitacaoItemInput => item !== null);

    if (itens.length === 0) {
      return { message: "Inclua ao menos um material." };
    }

    const { data: itensExistentes } = await supabase
      .from("solicitacao_itens")
      .select("id")
      .eq("solicitacao_id", solicitacaoId);

    const idsEnviados = new Set(
      itens.map((item) => item.id).filter((id): id is string => Boolean(id)),
    );
    const idsParaRemover = (itensExistentes ?? [])
      .map((item: any) => item.id)
      .filter((id: string) => !idsEnviados.has(id));

    if (idsParaRemover.length > 0) {
      await supabase
        .from("solicitacao_itens")
        .delete()
        .in("id", idsParaRemover);
    }

    for (const item of itens) {
      if (item.id) {
        await supabase
          .from("solicitacao_itens")
          .update({
            item_id: item.item_id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            observacao: item.observacao,
          })
          .eq("id", item.id);
      } else {
        await supabase.from("solicitacao_itens").insert({
          solicitacao_id: solicitacaoId,
          item_id: item.item_id,
          orcamento_item_id: null,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          observacao: item.observacao,
        });
      }
    }

    const { error } = await supabase
      .from("solicitacoes")
      .update({
        prioridade,
        observacao: text(formData, "observacao"),
        data_necessidade: text(formData, "data_necessidade"),
      })
      .eq("id", solicitacaoId);

    if (error) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível salvar as alterações.",
        ),
      };
    }

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "solicitacao_editada",
      ip: context.ip,
      userAgent: context.userAgent,
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return { message: "Solicitação atualizada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Segunda verificação de estoque (seção 3.2 do módulo de Estoque): o
// Compras decide, item a item, quanto sai do depósito x quanto vai pra
// cotação. Bloqueia "Iniciar cotação" até ser preenchida (estoque_decidido_at).
export async function decidirEstoqueSolicitacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "cotacoes.create");
    const solicitacaoId = text(formData, "solicitacao_id");

    if (!solicitacaoId) {
      return { message: "Dados inválidos." };
    }

    const { data: solicitacao } = await supabase
      .from("solicitacoes")
      .select("id,obra_id,estoque_decidido_at")
      .eq("id", solicitacaoId)
      .single();

    if (!solicitacao) {
      return { message: "Solicitação não encontrada." };
    }

    if (solicitacao.estoque_decidido_at) {
      return {
        message: "Esta decisão já foi registrada para esta solicitação.",
      };
    }

    const { data: itens } = await supabase
      .from("solicitacao_itens")
      .select("id,item_id,quantidade")
      .eq("solicitacao_id", solicitacaoId);

    if (!itens || itens.length === 0) {
      return { message: "Solicitação sem itens." };
    }

    const itemIds = itens
      .map((item: any) => item.item_id)
      .filter((id: string | null): id is string => Boolean(id));
    const disponibilidade = await getEstoqueDisponivelPorItem(itemIds);

    type Decisao = {
      id: string;
      itemId: string | null;
      input: number;
      maximo: number;
      centroCustoId: string | null;
    };

    const decisoes: Decisao[] = itens.map((item: any) => {
      const input = money(formData.get(`estoque_qtd_${item.id}`)) ?? 0;
      const disponivel = item.item_id
        ? (disponibilidade[item.item_id]?.quantidadeAtual ?? 0)
        : 0;
      const maximo = Math.min(Number(item.quantidade), disponivel);
      const centroCustoId = text(formData, `centro_custo_${item.id}`);

      return {
        id: item.id,
        itemId: item.item_id as string | null,
        input,
        maximo,
        centroCustoId,
      };
    });

    const invalido = decisoes.find(
      (decisao: Decisao) => decisao.input < 0 || decisao.input > decisao.maximo,
    );
    if (invalido) {
      return {
        message:
          "Quantidade retirada do estoque inválida — não pode passar do disponível.",
      };
    }

    const semCentroCusto = decisoes.find(
      (decisao: Decisao) => !decisao.centroCustoId,
    );
    if (semCentroCusto) {
      return { message: "Selecione o centro de custo de todos os itens." };
    }

    for (const decisao of decisoes) {
      await supabase
        .from("solicitacao_itens")
        .update({
          quantidade_estoque: decisao.input,
          orcamento_item_id: decisao.centroCustoId,
        })
        .eq("id", decisao.id);
    }

    const estoqueDecididoAt = new Date().toISOString();
    await supabase
      .from("solicitacoes")
      .update({ estoque_decidido_at: estoqueDecididoAt })
      .eq("id", solicitacaoId);

    const itensComRetirada = decisoes.filter(
      (decisao: Decisao) => decisao.input > 0,
    );

    if (itensComRetirada.length > 0) {
      const { data: requisicao, error: reqError } = await supabase
        .from("requisicoes_almox")
        .insert({
          cliente_id: profile.cliente_id,
          solicitacao_id: solicitacaoId,
          obra_id: solicitacao.obra_id,
          criado_por: profile.id,
        })
        .select("id")
        .single();

      if (reqError || !requisicao) {
        return {
          message: friendlyErrorMessage(
            reqError,
            "Não foi possível gerar a requisição ao almoxarifado.",
          ),
        };
      }

      const requisicaoItensRows = itensComRetirada
        .map((decisao: Decisao) => {
          const estoqueItemId = decisao.itemId
            ? disponibilidade[decisao.itemId]?.estoqueItemId
            : null;

          if (!estoqueItemId) {
            return null;
          }

          return {
            requisicao_id: requisicao.id,
            solicitacao_item_id: decisao.id,
            estoque_item_id: estoqueItemId,
            quantidade_solicitada: decisao.input,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (requisicaoItensRows.length !== itensComRetirada.length) {
        return {
          message:
            "Não foi possível localizar o item de estoque correspondente.",
        };
      }

      const { error: itensError } = await supabase
        .from("requisicao_almox_itens")
        .insert(requisicaoItensRows);

      if (itensError) {
        return {
          message: friendlyErrorMessage(
            itensError,
            "Não foi possível salvar os itens da requisição.",
          ),
        };
      }
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "estoque_decidido",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { itens_com_retirada: itensComRetirada.length },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    revalidatePath("/estoque/requisicoes");
    return { message: "Decisão registrada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function iniciarCotacao(formData: FormData) {
  const { supabase, user, profile } = await getActor();
  const permissions = await getPermissionsForUser(profile.id);
  await assertPermission(profile.role, permissions, "cotacoes.create");
  const id = text(formData, "solicitacao_id");

  if (!id) {
    throw new Error("Dados inválidos.");
  }

  const context = await getRequestContext();
  const { data: current } = await supabase
    .from("solicitacoes")
    .select("status, estoque_decidido_at")
    .eq("id", id)
    .single();

  // Espelha a trava da tela (precisaDecidirEstoque em compras/[id]/page.tsx)
  // no servidor: sem isso, dava pra pular a decisão de estoque via POST
  // direto e o pedido saía cotando/pedindo a quantidade cheia do item em vez
  // de (quantidade - quantidade_estoque).
  if (
    current &&
    STATUSES_AGUARDANDO_COTACAO.includes(current.status) &&
    !current.estoque_decidido_at
  ) {
    throw new Error(
      "Decida estoque x cotação de cada item (e o centro de custo) antes de iniciar a cotação.",
    );
  }

  await supabase
    .from("solicitacoes")
    .update({ status: "em_cotacao" })
    .eq("id", id);
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: user.id,
    entidade: "solicitacao",
    entidadeId: id,
    acao: "cotacao_iniciada",
    statusAnterior: current?.status,
    statusNovo: "em_cotacao",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath(`/compras/${id}`);
}

export async function salvarCotacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "cotacoes.create");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");
    const fornecedorId = text(formData, "fornecedor_id");

    if (!solicitacaoId || !fornecedorId) {
      return { message: "Selecione um fornecedor." };
    }

    const { data: existing } = await supabase
      .from("cotacoes")
      .select("id")
      .eq("solicitacao_id", solicitacaoId)
      .eq("fornecedor_id", fornecedorId)
      .maybeSingle();

    if (existing) {
      return { message: "Este fornecedor ja possui orcamento registrado." };
    }

    const itensBrutos = parseCotacaoItens(formData);

    if (itensBrutos.length === 0) {
      return {
        message: "Selecione ao menos um item para este fornecedor.",
      };
    }

    const semPreco = itensSemPreco(itensBrutos);
    if (semPreco.length > 0) {
      return {
        message:
          semPreco.length === 1
            ? 'Um item está incluído mas sem preço. Informe o valor unitário ou marque como "Não cotado".'
            : `${semPreco.length} itens estão incluídos mas sem preço. Informe o valor unitário de cada um ou marque como "Não cotado".`,
      };
    }

    const descontoPercentual = money(formData.get("desconto_percentual")) ?? 0;
    if (descontoPercentual < 0 || descontoPercentual > 100) {
      return { message: "Desconto deve estar entre 0 e 100%." };
    }

    const itens = aplicarDesconto(itensBrutos, descontoPercentual);
    const totalFornecedor = calcularTotalFornecedor(itens);

    const { data: cotacao, error } = await supabase
      .from("cotacoes")
      .insert({
        cliente_id: profile.cliente_id,
        solicitacao_id: solicitacaoId,
        fornecedor_id: fornecedorId,
        status: "respondida",
        observacoes_gerais: text(formData, "observacoes_gerais"),
        observacao: text(formData, "observacoes_gerais"),
        total_fornecedor: totalFornecedor,
        desconto_percentual: descontoPercentual || null,
        validado_por: user.id,
        validado_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !cotacao) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível salvar o orçamento.",
        ),
      };
    }

    await supabase
      .from("cotacao_itens")
      .insert(itens.map((item) => ({ ...item, cotacao_id: cotacao.id })));

    // Só avança pra "em_cotacao" se ainda não passou dessa etapa — sem essa
    // checagem, cadastrar mais um fornecedor manualmente depois de já ter
    // mandado pra aprovação regredia o status, e o link de aprovação já
    // compartilhado parava de funcionar (getPublicApprovalByToken exige
    // status aguardando_aprovacao/aprovacao) mesmo com o token ainda válido.
    const { data: current } = await supabase
      .from("solicitacoes")
      .select("status")
      .eq("id", solicitacaoId)
      .single();

    if (
      current &&
      (STATUSES_AGUARDANDO_COTACAO.includes(current.status) ||
        STATUSES_EM_COTACAO.includes(current.status))
    ) {
      await supabase
        .from("solicitacoes")
        .update({ status: "em_cotacao" })
        .eq("id", solicitacaoId);
    }

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "orcamento_registrado",
      dados: { fornecedor_id: fornecedorId, total_fornecedor: totalFornecedor },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return { message: "Orcamento registrado." };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

export async function uploadCotacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "cotacoes.create");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");
    const fornecedorId = text(formData, "fornecedor_id");
    const file = formData.get("arquivo");
    const itemIdsSelecionados = formData.getAll("item_ids") as string[];

    if (!solicitacaoId || !fornecedorId) {
      return { message: "Selecione um fornecedor." };
    }

    if (itemIdsSelecionados.length === 0) {
      return { message: "Selecione ao menos um item para este fornecedor." };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { message: "Selecione um arquivo (PDF ou foto) da cotação." };
    }

    const [{ data: itens }, { data: existingCotacao }] = await Promise.all([
      supabase
        .from("solicitacao_itens")
        .select("id,descricao,quantidade,unidade")
        .eq("solicitacao_id", solicitacaoId)
        .in("id", itemIdsSelecionados),
      supabase
        .from("cotacoes")
        .select("id")
        .eq("solicitacao_id", solicitacaoId)
        .eq("fornecedor_id", fornecedorId)
        .maybeSingle(),
    ]);

    let cotacaoId = existingCotacao?.id as string | undefined;

    if (!cotacaoId) {
      const { data: created, error: createError } = await supabase
        .from("cotacoes")
        .insert({
          cliente_id: profile.cliente_id,
          solicitacao_id: solicitacaoId,
          fornecedor_id: fornecedorId,
          status: "rascunho",
          total_fornecedor: 0,
        })
        .select("id")
        .single();

      if (createError || !created) {
        return {
          message: friendlyErrorMessage(
            createError,
            "Não foi possível registrar a cotação.",
          ),
        };
      }

      cotacaoId = created.id;
    }

    // Cria as linhas placeholder (sem preço ainda) pros itens escolhidos pra
    // este fornecedor — é isso que permite dividir a cotação (ex: fornecedor
    // de elétrica só cota os itens elétricos) e que a etapa de revisão saiba
    // exatamente quais itens pertencem a esta cotação.
    const { error: placeholderError } = await supabase
      .from("cotacao_itens")
      .upsert(
        itemIdsSelecionados.map((itemId) => ({
          cotacao_id: cotacaoId,
          solicitacao_item_id: itemId,
        })),
        {
          onConflict: "cotacao_id,solicitacao_item_id",
          ignoreDuplicates: true,
        },
      );

    if (placeholderError) {
      return {
        message: friendlyErrorMessage(
          placeholderError,
          "Não foi possível registrar os itens selecionados.",
        ),
      };
    }

    const storagePath = `${profile.cliente_id}/cotacoes/${cotacaoId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("anexos")
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      return { message: "Não foi possível enviar o arquivo." };
    }

    let extracaoIa: CotacaoExtraction | null = null;
    let extractionMessage: string | null = null;

    // Teto de uso por tenant — sem isso, uma conta comprometida (ou um loop
    // de upload) chama a IA sem limite, drenando o crédito da Anthropic.
    const iaAllowed = await checkRateLimit(
      `ia-extracao:${profile.cliente_id}`,
      30,
      60 * 60,
    );

    if (!iaAllowed) {
      extractionMessage =
        "Arquivo enviado. Limite de extrações automáticas por IA atingido nesta hora — preencha os valores manualmente.";
    } else {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        extracaoIa = await extractCotacaoFromFile({
          fileBuffer: buffer,
          contentType: file.type,
          solicitacaoItens: (itens ?? []).map((item: any) => ({
            id: item.id,
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            unidade: item.unidade,
          })),
        });
      } catch {
        extractionMessage =
          "Arquivo enviado, mas não foi possível extrair os valores automaticamente. Preencha manualmente.";
      }
    }

    await supabase
      .from("cotacoes")
      .update({
        arquivo_path: storagePath,
        arquivo_content_type: file.type,
        extracao_ia: extracaoIa,
      })
      .eq("id", cotacaoId);

    const { data: current } = await supabase
      .from("solicitacoes")
      .select("status")
      .eq("id", solicitacaoId)
      .single();

    if (current?.status === "em_cotacao") {
      await supabase
        .from("solicitacoes")
        .update({ status: "cotacao_recebida" })
        .eq("id", solicitacaoId);
    }

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "cotacao_recebida",
      statusAnterior: current?.status,
      statusNovo: "cotacao_recebida",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { fornecedor_id: fornecedorId, cotacao_id: cotacaoId },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return {
      message:
        extractionMessage ??
        "Cotação recebida. Revise os valores extraídos e confirme.",
    };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

type CotacaoRequestState = {
  message?: string;
  pdfUrl?: string;
};

// Gera um PDF só com os itens escolhidos (sem preço) pra mandar ao
// fornecedor pedir cotação — diferente de generatePedidoCompraPdf, que é o
// pedido final já com preços fechados. Não cria/edita nenhuma cotação; é só
// documento + link, a divisão real acontece quando o fornecedor responde
// (CotacaoForm/CotacaoUploadForm, que já respeitam a seleção de itens).
// O documento é o mesmo pra qualquer fornecedor — não pede pra escolher um
// aqui; a escolha de pra quem mandar acontece depois, no client, na hora de
// gerar os links de WhatsApp (um por fornecedor selecionado).
export async function gerarCotacaoRequestPdf(
  _state: CotacaoRequestState,
  formData: FormData,
): Promise<CotacaoRequestState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "cotacoes.create");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");
    const itemIdsSelecionados = formData.getAll("item_ids") as string[];

    if (!solicitacaoId) {
      return { message: "Solicitação inválida." };
    }

    if (itemIdsSelecionados.length === 0) {
      return { message: "Selecione ao menos um item." };
    }

    const [{ data: solicitacao }, { data: itens }] = await Promise.all([
      supabase
        .from("solicitacoes")
        .select(
          "codigo,status,estoque_decidido_at,obra:obras(nome,endereco,contratante_nome,contratante_documento)",
        )
        .eq("id", solicitacaoId)
        .single(),
      supabase
        .from("solicitacao_itens")
        .select("descricao,quantidade,quantidade_estoque,unidade,observacao")
        .eq("solicitacao_id", solicitacaoId)
        .in("id", itemIdsSelecionados),
    ]);

    if (!solicitacao) {
      return { message: "Dados não encontrados." };
    }

    // Mesma trava de iniciarCotacao: sem a decisão estoque x cotação, a
    // quantidade daqui sairia cheia (sem descontar o que já vai sair do
    // estoque) — o fornecedor cotaria mais do que realmente falta comprar.
    if (
      STATUSES_AGUARDANDO_COTACAO.includes(solicitacao.status) &&
      !solicitacao.estoque_decidido_at
    ) {
      return {
        message:
          "Decida estoque x cotação de cada item (e o centro de custo) antes de gerar o PDF de cotação.",
      };
    }

    const itensParaCotar = (itens ?? [])
      .map((item) => ({
        ...item,
        quantidadeCotar:
          Number(item.quantidade) - Number(item.quantidade_estoque ?? 0),
      }))
      .filter((item) => item.quantidadeCotar > 0);

    if (itensParaCotar.length === 0) {
      return {
        message:
          "Nenhum item selecionado precisa ir para cotação (tudo já sai do estoque).",
      };
    }

    const pdfBytes = await generateCotacaoRequestPdf({
      solicitacao: {
        codigo: solicitacao.codigo,
        obra: solicitacao.obra?.nome ?? null,
        obraEndereco: solicitacao.obra?.endereco ?? null,
        contratanteNome: solicitacao.obra?.contratante_nome ?? null,
        contratanteDocumento: solicitacao.obra?.contratante_documento ?? null,
      },
      itens: itensParaCotar.map((item) => ({
        descricao: item.descricao,
        quantidade: item.quantidadeCotar,
        unidade: item.unidade,
        observacao: item.observacao,
      })),
    });

    const storagePath = `${profile.cliente_id}/${solicitacaoId}/cotacao-solicitada/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("anexos")
      .upload(storagePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return {
        message: friendlyErrorMessage(
          uploadError,
          "Não foi possível gerar o PDF.",
        ),
      };
    }

    const { data: signed } = await supabase.storage
      .from("anexos")
      .createSignedUrl(storagePath, LINK_TTL_SECONDS);

    if (!signed?.signedUrl) {
      return { message: "PDF gerado, mas não foi possível criar o link." };
    }

    const shortUrl = await createShortLink({
      targetUrl: signed.signedUrl,
      clienteId: profile.cliente_id,
      createdBy: user.id,
    });

    // Persiste o link pra não precisar gerar de novo toda vez que a página é
    // revisitada — CotacaoRequestForm mostra esse valor como estado inicial.
    await supabase
      .from("solicitacoes")
      .update({
        cotacao_request_pdf_url: shortUrl,
        cotacao_request_pdf_path: storagePath,
        cotacao_request_pdf_gerado_em: new Date().toISOString(),
      })
      .eq("id", solicitacaoId);

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "cotacao_solicitada_pdf_gerado",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { item_ids: itemIdsSelecionados },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return { message: "PDF gerado.", pdfUrl: shortUrl };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function validarCotacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "cotacoes.validate");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");
    const cotacaoId = text(formData, "cotacao_id");

    if (!solicitacaoId || !cotacaoId) {
      return { message: "Dados inválidos." };
    }

    const itensBrutos = parseCotacaoItens(formData);

    if (itensBrutos.length === 0) {
      return { message: "Informe ao menos um item cotado." };
    }

    const semPreco = itensSemPreco(itensBrutos);
    if (semPreco.length > 0) {
      return {
        message:
          semPreco.length === 1
            ? 'Um item está sem preço. Informe o valor unitário ou marque como "Não cotado".'
            : `${semPreco.length} itens estão sem preço. Informe o valor unitário de cada um ou marque como "Não cotado".`,
      };
    }

    const descontoPercentual = money(formData.get("desconto_percentual")) ?? 0;
    if (descontoPercentual < 0 || descontoPercentual > 100) {
      return { message: "Desconto deve estar entre 0 e 100%." };
    }

    const itens = aplicarDesconto(itensBrutos, descontoPercentual);
    const totalFornecedor = calcularTotalFornecedor(itens);

    const { error: itensError } = await supabase.from("cotacao_itens").upsert(
      itens.map((item) => ({ ...item, cotacao_id: cotacaoId })),
      { onConflict: "cotacao_id,solicitacao_item_id" },
    );

    if (itensError) {
      return {
        message: friendlyErrorMessage(
          itensError,
          "Não foi possível salvar os itens da cotação.",
        ),
      };
    }

    const validadoAt = new Date().toISOString();
    const { error: cotacaoError } = await supabase
      .from("cotacoes")
      .update({
        observacoes_gerais: text(formData, "observacoes_gerais"),
        observacao: text(formData, "observacoes_gerais"),
        total_fornecedor: totalFornecedor,
        desconto_percentual: descontoPercentual || null,
        status: "respondida",
        validado_por: user.id,
        validado_at: validadoAt,
      })
      .eq("id", cotacaoId);

    if (cotacaoError) {
      return {
        message: friendlyErrorMessage(
          cotacaoError,
          "Não foi possível validar a cotação.",
        ),
      };
    }

    const { data: current } = await supabase
      .from("solicitacoes")
      .select("status")
      .eq("id", solicitacaoId)
      .single();

    if (
      current?.status === "cotacao_recebida" ||
      current?.status === "em_cotacao"
    ) {
      await supabase
        .from("solicitacoes")
        .update({ status: "validado" })
        .eq("id", solicitacaoId);
    }

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "cotacao_validada",
      statusAnterior: current?.status,
      statusNovo: "validado",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { cotacao_id: cotacaoId, total_fornecedor: totalFornecedor },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return { message: "Cotação validada." };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

export async function programarPedido(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "solicitacoes.edit");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");
    const prazoConfirmadoDias = money(formData.get("prazo_confirmado_dias"));
    const dataPrevistaEntrega = text(formData, "data_prevista_entrega");
    const localEntregaInput = text(formData, "local_entrega");

    if (!solicitacaoId) {
      return { message: "Dados inválidos." };
    }

    if (!isPedidoLocalEntrega(localEntregaInput)) {
      return { message: "Escolha como o pedido vai chegar." };
    }

    const localEntrega = localEntregaInput;
    const retiradaAutorizadoNome = text(formData, "retirada_autorizado_nome");
    const retiradaAutorizadoDocumento = text(
      formData,
      "retirada_autorizado_documento",
    );

    if (localEntrega === "retirada" && !retiradaAutorizadoNome) {
      return { message: "Informe o nome de quem vai retirar o pedido." };
    }

    const { data: current } = await supabase
      .from("solicitacoes")
      .select("status")
      .eq("id", solicitacaoId)
      .single();

    if (current?.status !== "pdf_gerado") {
      return {
        message: "Só é possível programar o pedido após o PDF ser gerado.",
      };
    }

    await supabase
      .from("pedidos")
      .update({
        prazo_confirmado_dias: prazoConfirmadoDias,
        data_prevista_entrega: dataPrevistaEntrega,
        local_entrega: localEntrega,
        retirada_autorizado_nome:
          localEntrega === "retirada" ? retiradaAutorizadoNome : null,
        retirada_autorizado_documento:
          localEntrega === "retirada" ? retiradaAutorizadoDocumento : null,
      })
      .eq("solicitacao_id", solicitacaoId);

    await supabase
      .from("solicitacoes")
      .update({ status: "pedido_programado" })
      .eq("id", solicitacaoId);

    // Regenera o PDF de cada pedido (pode ter mais de um, se a aprovação foi
    // dividida entre fornecedores) agora que o local de entrega e quem está
    // programando o pedido já são conhecidos — na aprovação pública esses
    // dados ainda não existiam. Falha ao regenerar não desfaz a programação
    // (o link antigo, sem essas infos, continua funcionando).
    const { data: solicitacaoCompleta } = await supabase
      .from("solicitacoes")
      .select(
        `
        *,
        obra:obras(*),
        itens:solicitacao_itens(*),
        cotacoes:cotacoes(*, fornecedor:fornecedores(*), itens:cotacao_itens(*))
        `,
      )
      .eq("id", solicitacaoId)
      .single();

    const { data: pedidosDaSolicitacao } = await supabase
      .from("pedidos")
      .select("id,numero,fornecedor_id,valor_total,pdf_path")
      .eq("solicitacao_id", solicitacaoId);

    for (const pedido of pedidosDaSolicitacao ?? []) {
      const itemIdsDoGrupo = new Set(
        (solicitacaoCompleta?.itens ?? [])
          .filter(
            (item: any) => item.fornecedor_aprovado_id === pedido.fornecedor_id,
          )
          .map((item: any) => item.id),
      );
      const cotacao = (solicitacaoCompleta?.cotacoes ?? []).find(
        (c: any) => c.fornecedor_id === pedido.fornecedor_id,
      );

      if (!solicitacaoCompleta || !cotacao) {
        continue;
      }

      const itensDoGrupo = (solicitacaoCompleta.itens ?? []).filter(
        (item: any) => itemIdsDoGrupo.has(item.id),
      );
      const cotacaoItensDoGrupo = (cotacao.itens ?? []).filter((ci: any) =>
        itemIdsDoGrupo.has(ci.solicitacao_item_id),
      );

      const pdfBytes = await generatePedidoCompraPdf({
        pedidoNumero: pedido.numero ?? "",
        solicitacao: { ...solicitacaoCompleta, itens: itensDoGrupo },
        cotacao: {
          ...cotacao,
          itens: cotacaoItensDoGrupo,
          total_fornecedor: pedido.valor_total,
        },
        pedido: {
          localEntrega,
          retiradaAutorizadoNome:
            localEntrega === "retirada" ? retiradaAutorizadoNome : null,
          prazoConfirmadoDias,
          dataPrevistaEntrega,
        },
        responsavelNome: profile.nome,
      });

      const pdfPath =
        pedido.pdf_path ??
        `${solicitacaoCompleta.cliente_id}/${solicitacaoId}/${pedido.numero}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("pedidos-pdf")
        .upload(pdfPath, Buffer.from(pdfBytes), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        continue;
      }

      const { data: signed } = await supabase.storage
        .from("pedidos-pdf")
        .createSignedUrl(pdfPath, LINK_TTL_SECONDS);

      const pdfShortUrl = signed?.signedUrl
        ? await createShortLinkWithClient(supabase, {
            targetUrl: signed.signedUrl,
            clienteId: solicitacaoCompleta.cliente_id,
          })
        : null;

      await supabase
        .from("pedidos")
        .update({ pdf_path: pdfPath, pdf_url: pdfShortUrl })
        .eq("id", pedido.id);
    }

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "pedido_programado",
      statusAnterior: current?.status,
      statusNovo: "pedido_programado",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: {
        prazo_confirmado_dias: prazoConfirmadoDias,
        data_prevista_entrega: dataPrevistaEntrega,
      },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return { message: "Pedido programado." };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

// Confirma que o pedido chegou de verdade. "obra"/"depósito" já sabem seu
// destino desde programarPedido; "retirada" só definiu quem ia buscar, então
// aqui pergunta o destino final antes de decidir o efeito no estoque — só
// entra estoque quando o destino efetivo é "depósito", e só depois de
// confirmado (evita contar material que ainda não chegou de verdade).
export async function confirmarRecebimentoPedido(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "solicitacoes.edit");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");

    if (!solicitacaoId) {
      return { message: "Dados inválidos." };
    }

    const { data: current } = await supabase
      .from("solicitacoes")
      .select("status")
      .eq("id", solicitacaoId)
      .single();

    if (current?.status !== "pedido_enviado") {
      return {
        message:
          "Só é possível confirmar o recebimento após o pedido ser enviado.",
      };
    }

    // Uma solicitação dividida entre fornecedores gera um pedido POR
    // fornecedor (registrarDecisaoPublica), mas o destino de entrega é
    // decidido uma vez só pra solicitação inteira (programarPedido aplica o
    // mesmo local_entrega a todos os pedidos dela) — por isso todos os
    // pedidos aqui têm o mesmo local_entrega, e o destino final é lido de
    // qualquer um deles.
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id,numero,fornecedor_id,local_entrega")
      .eq("solicitacao_id", solicitacaoId);

    if (!pedidos || pedidos.length === 0) {
      return { message: "Pedido não encontrado." };
    }

    let destinoEfetivo: PedidoLocalEntrega | null = pedidos[0].local_entrega;
    let retiradaDestinoFinal: PedidoLocalEntrega | null = null;

    if (pedidos[0].local_entrega === "retirada") {
      const destinoInput = text(formData, "destino_final");

      if (destinoInput !== "obra" && destinoInput !== "deposito") {
        return { message: "Escolha o destino final da retirada." };
      }

      destinoEfetivo = destinoInput;
      retiradaDestinoFinal = destinoInput;
    }

    await supabase
      .from("pedidos")
      .update({
        status: "recebido",
        recebido_em: new Date().toISOString(),
        recebido_por: profile.id,
        retirada_destino_final: retiradaDestinoFinal,
      })
      .eq("solicitacao_id", solicitacaoId);

    await supabase
      .from("solicitacoes")
      .update({ status: "finalizada", finalizada_at: new Date().toISOString() })
      .eq("id", solicitacaoId);

    if (destinoEfetivo === "deposito") {
      for (const pedido of pedidos) {
        // Cada item só entra em estoque para o fornecedor que foi aprovado
        // para ELE (fornecedor_aprovado_id), não pra todos os itens que esse
        // fornecedor cotou — importante quando a solicitação foi dividida.
        const { data: itensDoFornecedor } = await supabase
          .from("solicitacao_itens")
          .select("item_id,quantidade,quantidade_estoque")
          .eq("solicitacao_id", solicitacaoId)
          .eq("fornecedor_aprovado_id", pedido.fornecedor_id);

        for (const solicitacaoItem of itensDoFornecedor ?? []) {
          const itemId = solicitacaoItem.item_id;

          if (!itemId) {
            continue;
          }

          const quantidadeComprada =
            (solicitacaoItem.quantidade ?? 0) -
            (solicitacaoItem.quantidade_estoque ?? 0);

          if (quantidadeComprada <= 0) {
            continue;
          }

          const { data: estoqueItem } = await supabase
            .from("estoque_itens")
            .upsert(
              { cliente_id: profile.cliente_id, item_id: itemId },
              { onConflict: "cliente_id,item_id", ignoreDuplicates: false },
            )
            .select("id")
            .single();

          if (!estoqueItem) {
            continue;
          }

          await supabase.from("movimentacoes_estoque").insert({
            cliente_id: profile.cliente_id,
            estoque_item_id: estoqueItem.id,
            tipo: "entrada",
            quantidade: quantidadeComprada,
            motivo: `Recebimento do pedido ${pedido.numero ?? ""}`.trim(),
            solicitacao_id: solicitacaoId,
            responsavel_id: profile.id,
          });
        }
      }
    }

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId,
      acao: "pedido_recebido",
      statusAnterior: current.status,
      statusNovo: "finalizada",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: {
        local_entrega: pedidos[0].local_entrega,
        destino_efetivo: destinoEfetivo,
      },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    if (destinoEfetivo === "deposito") {
      revalidatePath("/estoque");
    }
    return { message: "Recebimento confirmado." };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

export async function enviarParaAprovacao(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user, profile } = await getActor();
    const permissions = await getPermissionsForUser(profile.id);
    await assertPermission(profile.role, permissions, "cotacoes.edit");
    const context = await getRequestContext();
    const solicitacaoId = text(formData, "solicitacao_id");

    if (!solicitacaoId) {
      return { message: "Dados inválidos." };
    }

    const { data: cotacoesDaSolicitacao, count } = await supabase
      .from("cotacoes")
      .select("id,validado_at", { count: "exact" })
      .eq("solicitacao_id", solicitacaoId);

    if ((count ?? 0) === 0) {
      return {
        message:
          "Registre ao menos um orçamento antes de enviar para aprovação.",
      };
    }

    const naoValidadas = (cotacoesDaSolicitacao ?? []).filter(
      (cotacao: any) => !cotacao.validado_at,
    );

    if (naoValidadas.length > 0) {
      return {
        message:
          "Todas as cotações precisam ser validadas antes de enviar para aprovação.",
      };
    }

    // Com a cotação dividida por fornecedor, "existe cotação validada" não
    // garante mais que TODOS os itens foram cotados por alguém — cada
    // fornecedor pode ter ficado só com uma parte (ex: elétrica x tinta).
    const validadasIds = (cotacoesDaSolicitacao ?? [])
      .filter((cotacao: any) => cotacao.validado_at)
      .map((cotacao: any) => cotacao.id);

    const [{ data: todosItens }, { data: itensCotados }] = await Promise.all([
      supabase
        .from("solicitacao_itens")
        .select("id")
        .eq("solicitacao_id", solicitacaoId),
      supabase
        .from("cotacao_itens")
        .select("solicitacao_item_id")
        .in("cotacao_id", validadasIds),
    ]);

    const cobertos = new Set(
      (itensCotados ?? []).map((item: any) => item.solicitacao_item_id),
    );
    const semCotacao = (todosItens ?? []).filter(
      (item: any) => !cobertos.has(item.id),
    );

    if (semCotacao.length > 0) {
      return {
        message: `${semCotacao.length} ite${semCotacao.length > 1 ? "ns" : "m"} da solicitação ainda ${semCotacao.length > 1 ? "não têm" : "não tem"} cotação de nenhum fornecedor.`,
      };
    }

    // 6 bytes (8 caracteres em base64url) — curto o suficiente pra caber
    // numa mensagem de WhatsApp sem ficar feio, mas ainda com entropia alta
    // o bastante (2^48 combinações) pra um link que expira em 14 dias e é
    // invalidado assim que a decisão é registrada.
    const token = randomBytes(6).toString("base64url");
    const { data: current } = await supabase
      .from("solicitacoes")
      .select("status")
      .eq("id", solicitacaoId)
      .single();

    await supabase
      .from("solicitacoes")
      .update({
        status: "aguardando_aprovacao",
        aprovacao_token: token,
        aprovacao_token_expires_at: new Date(
          Date.now() + LINK_TTL_SECONDS * 1000,
        ).toISOString(),
      })
      .eq("id", solicitacaoId);

    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: user.id,
      entidade: "solicitacao",
      entidadeId: solicitacaoId!,
      acao: "enviada_para_aprovacao",
      statusAnterior: current?.status,
      statusNovo: "aguardando_aprovacao",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: {
        total_orcamentos: count ?? 0,
      },
    });

    revalidatePath(`/compras/${solicitacaoId}`);
    return {
      message: "Link de aprovação gerado.",
      approvalUrl: `/aprovacao/${token}`,
    };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

export async function registrarDecisaoPublica(formData: FormData) {
  const context = await getRequestContext();
  const allowed = await checkRateLimit(
    `aprovacao:${context.ip ?? "unknown"}`,
    20,
    10 * 60,
  );
  if (!allowed) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos.");
  }

  const supabase = createAdminClient();
  const token = text(formData, "token");
  const decisao = text(formData, "decisao");
  const solicitacaoId = text(formData, "solicitacao_id");
  const comentario = text(formData, "comentario");
  const prazoPagamento = text(formData, "prazo_pagamento");
  const gestorNome = text(formData, "gestor_nome");
  const gestorEmail = text(formData, "gestor_email");
  const assignmentsRaw = text(formData, "assignments");

  if (!token || !solicitacaoId || !gestorNome) {
    throw new Error("Dados de aprovacao incompletos.");
  }

  // Cada item aprovado guarda o fornecedor pra quem foi (permite dividir a
  // mesma solicitação entre fornecedores diferentes). O cliente manda essa
  // atribuição, mas ela NUNCA é confiada às cegas: abaixo é revalidado que
  // cada par item/fornecedor corresponde a uma cotação real, não expirada,
  // com preço informado — como qualquer dado vindo de formulário público.
  type Atribuicao = { solicitacao_item_id: string; fornecedor_id: string };
  let assignments: Atribuicao[] = [];
  if (decisao === "autorizar") {
    try {
      assignments = assignmentsRaw ? JSON.parse(assignmentsRaw) : [];
    } catch {
      throw new Error("Dados de aprovação inválidos.");
    }
    if (
      !Array.isArray(assignments) ||
      assignments.length === 0 ||
      assignments.some(
        (a) =>
          typeof a?.solicitacao_item_id !== "string" ||
          typeof a?.fornecedor_id !== "string",
      )
    ) {
      throw new Error("Selecione o fornecedor de cada item.");
    }
  }

  // cliente_id nunca vem do formulário (campo oculto adulterável) — é
  // sempre derivado da solicitação carregada pelo token, junto com os
  // mesmos filtros de status/expiração que a página de leitura já aplica
  // (getPublicApprovalByToken), pra um token vencido não continuar
  // aprovando compra por essa action.
  const { data: solicitacao } = await supabase
    .from("solicitacoes")
    .select(
      `
      *,
      cliente:clientes(*),
      obra:obras(*),
      responsavel_obra:profiles!solicitacoes_responsavel_obra_id_fkey(id,nome,telefone),
      itens:solicitacao_itens(*),
      cotacoes:cotacoes(*, fornecedor:fornecedores(*), itens:cotacao_itens(*))
      `,
    )
    .eq("id", solicitacaoId)
    .eq("aprovacao_token", token)
    .in("status", ["aguardando_aprovacao", "aprovacao"])
    .gt("aprovacao_token_expires_at", new Date().toISOString())
    .single();

  if (!solicitacao) {
    throw new Error("Token de aprovacao invalido ou expirado.");
  }

  const clienteId = solicitacao.cliente_id;
  const itensDaSolicitacao = new Set(
    (solicitacao.itens ?? []).map((item: { id: string }) => item.id),
  );
  const cotacoesPorFornecedor = new Map<string, any>(
    (solicitacao.cotacoes ?? []).map((cotacao: any) => [
      cotacao.fornecedor_id,
      cotacao,
    ]),
  );

  // Grupos: fornecedor_id -> ids dos itens aprovados para ele.
  const grupos = new Map<string, Set<string>>();

  if (decisao === "autorizar") {
    // Item cotado de verdade por pelo menos um fornecedor — mesmo critério
    // de cotacaoItemValido em aprovacao-decisao.tsx.
    const temCotacaoValida = (itemId: string) =>
      (solicitacao.cotacoes ?? []).some((cotacao: any) =>
        (cotacao.itens ?? []).some(
          (ci: any) =>
            ci.solicitacao_item_id === itemId &&
            !ci.item_nao_cotado &&
            ci.preco_unitario != null,
        ),
      );

    // Só itens que realmente precisam ser comprados (quantidade além do que
    // o estoque já cobre) E que algum fornecedor de fato cotou exigem
    // fornecedor escolhido — os demais nunca aparecem na tela de decisão
    // (mesmo filtro do Comparativo/AprovacaoDecisao) e não entram no pedido.
    const itensParaComprar = (solicitacao.itens ?? []).filter(
      (item: {
        id: string;
        quantidade: number;
        quantidade_estoque: number | null;
      }) =>
        Number(item.quantidade) - Number(item.quantidade_estoque ?? 0) > 0 &&
        temCotacaoValida(item.id),
    );

    for (const item of itensParaComprar) {
      if (!assignments.some((a) => a.solicitacao_item_id === item.id)) {
        throw new Error("Todos os itens precisam ter um fornecedor escolhido.");
      }
    }

    for (const atribuicao of assignments) {
      if (!itensDaSolicitacao.has(atribuicao.solicitacao_item_id)) {
        throw new Error("Item inválido na aprovação.");
      }

      const cotacao = cotacoesPorFornecedor.get(atribuicao.fornecedor_id);
      const cotacaoItem = cotacao?.itens?.find(
        (ci: any) => ci.solicitacao_item_id === atribuicao.solicitacao_item_id,
      );

      if (
        !cotacao ||
        !cotacaoItem ||
        cotacaoItem.item_nao_cotado ||
        cotacaoItem.preco_unitario == null
      ) {
        throw new Error("Fornecedor selecionado não cotou este item.");
      }

      const grupo = grupos.get(atribuicao.fornecedor_id) ?? new Set<string>();
      grupo.add(atribuicao.solicitacao_item_id);
      grupos.set(atribuicao.fornecedor_id, grupo);
    }
  }

  const fornecedoresAprovados = [...grupos.keys()];
  const status = decisao === "autorizar" ? "aprovada" : "rejeitada";
  const decidedAt = new Date().toISOString();
  // Divisão entre fornecedores diferentes não cabe num único campo — o
  // registro completo de quem ficou com o quê está nos itens (abaixo) e nos
  // pedidos gerados (um por fornecedor). Aqui só fica preenchido quando não
  // houve divisão, mantendo o caso simples idêntico ao comportamento antigo.
  const fornecedorUnico =
    fornecedoresAprovados.length === 1 ? fornecedoresAprovados[0] : null;

  await supabase.from("aprovacoes").insert({
    cliente_id: clienteId,
    solicitacao_id: solicitacaoId,
    aprovador_id: null,
    fornecedor_escolhido_id: decisao === "autorizar" ? fornecedorUnico : null,
    status,
    comentario,
    prazo_pagamento: decisao === "autorizar" ? prazoPagamento : null,
    gestor_nome: gestorNome,
    gestor_email: gestorEmail,
    decided_at: decidedAt,
  });

  await supabase
    .from("solicitacoes")
    .update({
      status: decisao === "autorizar" ? "pdf_gerado" : "rejeitada",
      fornecedor_aprovado_id: decisao === "autorizar" ? fornecedorUnico : null,
      aprovacao_token: null,
      pdf_gerado_at: decisao === "autorizar" ? decidedAt : null,
    })
    .eq("id", solicitacaoId)
    .eq("aprovacao_token", token);

  if (decisao === "autorizar") {
    for (const atribuicao of assignments) {
      await supabase
        .from("solicitacao_itens")
        .update({ fornecedor_aprovado_id: atribuicao.fornecedor_id })
        .eq("id", atribuicao.solicitacao_item_id);
    }

    let sequencia = 0;
    for (const fornecedorId of fornecedoresAprovados) {
      sequencia += 1;
      const itemIdsDoGrupo = grupos.get(fornecedorId)!;
      const cotacao = cotacoesPorFornecedor.get(fornecedorId);
      const itensDoGrupo = (solicitacao.itens ?? []).filter((item: any) =>
        itemIdsDoGrupo.has(item.id),
      );
      const cotacaoItensDoGrupo = (cotacao.itens ?? []).filter((ci: any) =>
        itemIdsDoGrupo.has(ci.solicitacao_item_id),
      );
      const totalGrupo = cotacaoItensDoGrupo.reduce(
        (sum: number, ci: any) => sum + Number(ci.valor_total ?? 0),
        0,
      );

      const pedidoNumero =
        fornecedoresAprovados.length > 1
          ? `PED-${solicitacao.codigo ?? Date.now()}-${sequencia}`
          : `PED-${solicitacao.codigo ?? Date.now()}`;

      const pdfBytes = await generatePedidoCompraPdf({
        pedidoNumero,
        solicitacao: { ...solicitacao, itens: itensDoGrupo },
        cotacao: {
          ...cotacao,
          itens: cotacaoItensDoGrupo,
          total_fornecedor: totalGrupo,
        },
        // Local de entrega e responsável pelo pedido ainda não existem
        // nesse momento (só depois de programarPedido) — o PDF é
        // regenerado lá assim que essa decisão é tomada.
        responsavelNome: null,
      });
      const pdfPath = `${clienteId}/${solicitacaoId}/${pedidoNumero}.pdf`;

      await supabase.storage
        .from("pedidos-pdf")
        .upload(pdfPath, Buffer.from(pdfBytes), {
          contentType: "application/pdf",
          upsert: true,
        });

      const { data: signed } = await supabase.storage
        .from("pedidos-pdf")
        .createSignedUrl(pdfPath, LINK_TTL_SECONDS);

      const pdfShortUrl = signed?.signedUrl
        ? await createShortLinkWithClient(supabase, {
            targetUrl: signed.signedUrl,
            clienteId,
          })
        : null;

      await supabase.from("pedidos").insert({
        cliente_id: clienteId,
        solicitacao_id: solicitacaoId,
        fornecedor_id: fornecedorId,
        numero: pedidoNumero,
        status: "emitido",
        valor_total: totalGrupo,
        pdf_path: pdfPath,
        pdf_url: pdfShortUrl,
        autorizado_por_nome: gestorNome,
        autorizado_por_email: gestorEmail,
        autorizado_at: decidedAt,
        emitido_at: decidedAt,
      });
    }
  }

  await supabase.from("historico").insert({
    cliente_id: clienteId,
    actor_id: null,
    entidade: "solicitacao",
    entidade_id: solicitacaoId,
    acao: decisao === "autorizar" ? "gestor_autorizou" : "gestor_recusou",
    status_anterior: solicitacao.status,
    status_novo: decisao === "autorizar" ? "pdf_gerado" : "rejeitada",
    ip: context.ip,
    user_agent: context.userAgent,
    dados: {
      fornecedores: fornecedoresAprovados,
      comentario,
      gestor_nome: gestorNome,
      gestor_email: gestorEmail,
    },
  });

  redirect(`/aprovacao/${token}/concluida`);
}

// Estados a partir dos quais cada etapa pode ser aplicada. "pdf_gerado" não
// aparece aqui: quem seta esse status é registrarDecisaoPublica (aprovação
// pública), e o "pedido_programado" tem seu próprio server action
// (programarPedido, que exige prazo/data). Evita a inserção duplicada de
// `pedidos` que existia aqui antes.
const FLOW_TRANSITIONS: Record<string, string[]> = {
  rascunho: ["cancelada"],
  aberta: ["cancelada"],
  em_cotacao: ["cancelada"],
  cotacao_recebida: ["cancelada"],
  validado: ["cancelada"],
  aguardando_aprovacao: ["cancelada"],
  // Recusada pelo gestor: Compras pode desistir (cancelar) ou tentar de
  // novo — reenviarParaAprovacao volta o status pra "aguardando_aprovacao"
  // diretamente, não passa por "cancelada" nesse caso.
  rejeitada: ["cancelada"],
  pedido_programado: ["pedido_enviado", "cancelada"],
  // "finalizada" não é mais genérico: só sai daqui via
  // confirmarRecebimentoPedido, que exige escolher/confirmar o destino antes
  // de decidir o efeito no estoque.
  pedido_enviado: ["cancelada"],
};

export async function avancarFluxo(formData: FormData) {
  const { supabase, user, profile } = await getActor();
  const permissions = await getPermissionsForUser(profile.id);
  await assertPermission(profile.role, permissions, "solicitacoes.edit");
  const context = await getRequestContext();
  const solicitacaoId = text(formData, "solicitacao_id");
  const etapa = text(formData, "etapa");

  if (!solicitacaoId) {
    throw new Error("Dados inválidos.");
  }

  const { data: current } = await supabase
    .from("solicitacoes")
    .select("status")
    .eq("id", solicitacaoId)
    .single();

  if (
    !current ||
    !etapa ||
    !FLOW_TRANSITIONS[current.status]?.includes(etapa)
  ) {
    throw new Error("Transição de status inválida.");
  }

  const novoStatus = etapa as SolicitacaoStatus;
  const updates: Database["public"]["Tables"]["solicitacoes"]["Update"] = {
    status: novoStatus,
  };

  if (novoStatus === "pedido_enviado") {
    updates.pedido_enviado_at = new Date().toISOString();
  }

  if (novoStatus === "cancelada") {
    updates.cancelada_at = new Date().toISOString();
  }

  await supabase.from("solicitacoes").update(updates).eq("id", solicitacaoId);

  if (novoStatus === "pedido_enviado") {
    await supabase
      .from("pedidos")
      .update({ status: "enviado" })
      .eq("solicitacao_id", solicitacaoId);
  }

  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: user.id,
    entidade: "solicitacao",
    entidadeId: solicitacaoId,
    acao: `fluxo_${novoStatus}`,
    statusAnterior: current.status,
    statusNovo: updates.status,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath(`/compras/${solicitacaoId}`);
}
