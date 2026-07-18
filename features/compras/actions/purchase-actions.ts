"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { money, text } from "@/lib/form-data";
import {
  assertPermission,
  getLinkedObrasForUser,
  getPermissionsForUser,
  isGestorRole,
  normalizeRole,
} from "@/lib/permissions";
import { registrarHistorico } from "@/services/historico-service";
import { generatePedidoCompraPdf } from "@/services/pdf-service";
import { getRequestContext } from "@/services/request-context";
import { extractCotacaoFromFile } from "@/services/ai-extraction-service";
import { getEstoqueDisponivelPorItem } from "@/services/estoque-service";

type ActionState = {
  message?: string;
};

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
  const supabase = (await createClient()) as any;
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

  if (!profile?.cliente_id) {
    throw new Error("Perfil sem cliente vinculado.");
  }

  return {
    supabase,
    user,
    profile: { ...profile, role: normalizeRole(profile.role) },
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

function calcularTotalFornecedor(
  itens: CotacaoItemInput[],
  frete: number | null,
) {
  const totalItens = itens.reduce(
    (sum, item) => sum + Number(item.valor_total ?? 0),
    0,
  );
  return Number((totalItens + Number(frete ?? 0)).toFixed(2));
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

    const codigo = `SC-${Date.now().toString(36).toUpperCase()}`;
    const { data: solicitacao, error } = await supabase
      .from("solicitacoes")
      .insert({
        cliente_id: clienteId,
        obra_id: obraId,
        solicitante_id: user.id,
        responsavel_obra_id: finalResponsavelObraId,
        prioridade: text(formData, "prioridade") ?? "normal",
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

    const itens = Array.from({ length: 10 })
      .map((_, index) => {
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
      .filter(Boolean);

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

      const requisicaoItensRows = itensComRetirada.map((decisao: Decisao) => ({
        requisicao_id: requisicao.id,
        solicitacao_item_id: decisao.id,
        estoque_item_id: decisao.itemId
          ? disponibilidade[decisao.itemId]?.estoqueItemId
          : null,
        quantidade_solicitada: decisao.input,
      }));

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
  const context = await getRequestContext();
  const { data: current } = await supabase
    .from("solicitacoes")
    .select("status")
    .eq("id", id)
    .single();

  await supabase
    .from("solicitacoes")
    .update({ status: "em_cotacao" })
    .eq("id", id);
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: user.id,
    entidade: "solicitacao",
    entidadeId: id!,
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

    const frete = money(formData.get("frete"));
    const itens = parseCotacaoItens(formData);
    const totalFornecedor = calcularTotalFornecedor(itens, frete);

    const { data: cotacao, error } = await supabase
      .from("cotacoes")
      .insert({
        cliente_id: profile.cliente_id,
        solicitacao_id: solicitacaoId,
        fornecedor_id: fornecedorId,
        status: "respondida",
        frete,
        prazo_dias: money(formData.get("prazo_dias")),
        forma_pagamento: text(formData, "forma_pagamento"),
        observacoes_gerais: text(formData, "observacoes_gerais"),
        observacao: text(formData, "observacoes_gerais"),
        total_fornecedor: totalFornecedor,
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

    await supabase
      .from("solicitacoes")
      .update({ status: "em_cotacao" })
      .eq("id", solicitacaoId);

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

    if (!solicitacaoId || !fornecedorId) {
      return { message: "Selecione um fornecedor." };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { message: "Selecione um arquivo (PDF ou foto) da cotação." };
    }

    const [{ data: itens }, { data: existingCotacao }] = await Promise.all([
      supabase
        .from("solicitacao_itens")
        .select("id,descricao,quantidade,unidade")
        .eq("solicitacao_id", solicitacaoId),
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

    const storagePath = `${profile.cliente_id}/cotacoes/${cotacaoId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("anexos")
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      return { message: "Não foi possível enviar o arquivo." };
    }

    let extracaoIa: unknown = null;
    let extractionMessage: string | null = null;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      extracaoIa = await extractCotacaoFromFile({
        fileBuffer: buffer,
        contentType: file.type,
        solicitacaoItens: (itens ?? []).map((item: any) => ({
          descricao: item.descricao,
          quantidade: Number(item.quantidade),
          unidade: item.unidade,
        })),
      });
    } catch {
      extractionMessage =
        "Arquivo enviado, mas não foi possível extrair os valores automaticamente. Preencha manualmente.";
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

    const frete = money(formData.get("frete"));
    const itens = parseCotacaoItens(formData);

    if (itens.length === 0) {
      return { message: "Informe ao menos um item cotado." };
    }

    const totalFornecedor = calcularTotalFornecedor(itens, frete);

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
        frete,
        prazo_dias: money(formData.get("prazo_dias")),
        forma_pagamento: text(formData, "forma_pagamento"),
        observacoes_gerais: text(formData, "observacoes_gerais"),
        observacao: text(formData, "observacoes_gerais"),
        total_fornecedor: totalFornecedor,
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

    if (!solicitacaoId) {
      return { message: "Dados inválidos." };
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
      })
      .eq("solicitacao_id", solicitacaoId);

    await supabase
      .from("solicitacoes")
      .update({ status: "pedido_programado" })
      .eq("id", solicitacaoId);

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

    const token = randomBytes(32).toString("hex");
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
          Date.now() + 1000 * 60 * 60 * 24 * 14,
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
    return { message: `Link publico gerado: /aprovacao/${token}` };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error),
    };
  }
}

export async function registrarDecisaoPublica(formData: FormData) {
  const supabase = createAdminClient() as any;
  const context = await getRequestContext();
  const token = text(formData, "token");
  const decisao = text(formData, "decisao");
  const solicitacaoId = text(formData, "solicitacao_id");
  const clienteId = text(formData, "cliente_id");
  const fornecedorId = text(formData, "fornecedor_id");
  const comentario = text(formData, "comentario");
  const gestorNome = text(formData, "gestor_nome");
  const gestorEmail = text(formData, "gestor_email");

  if (!token || !solicitacaoId || !clienteId || !gestorNome) {
    throw new Error("Dados de aprovacao incompletos.");
  }

  if (decisao === "autorizar" && !fornecedorId) {
    throw new Error("Selecione o fornecedor autorizado.");
  }

  const { data: solicitacao } = await supabase
    .from("solicitacoes")
    .select(
      `
      *,
      cliente:clientes(*),
      obra:obras(*),
      responsavel_obra:profiles!solicitacoes_responsavel_obra_id_fkey(id,nome,telefone),
      itens:solicitacao_itens(*)
      `,
    )
    .eq("id", solicitacaoId)
    .eq("aprovacao_token", token)
    .single();

  if (!solicitacao) {
    throw new Error("Token de aprovacao invalido ou expirado.");
  }

  const status = decisao === "autorizar" ? "aprovada" : "rejeitada";
  const decidedAt = new Date().toISOString();
  await supabase.from("aprovacoes").insert({
    cliente_id: clienteId,
    solicitacao_id: solicitacaoId,
    aprovador_id: null,
    fornecedor_escolhido_id: decisao === "autorizar" ? fornecedorId : null,
    status,
    comentario,
    gestor_nome: gestorNome,
    gestor_email: gestorEmail,
    decided_at: decidedAt,
  });

  await supabase
    .from("solicitacoes")
    .update({
      status: decisao === "autorizar" ? "pdf_gerado" : "rejeitada",
      fornecedor_aprovado_id: decisao === "autorizar" ? fornecedorId : null,
      aprovacao_token: null,
      pdf_gerado_at: decisao === "autorizar" ? decidedAt : null,
    })
    .eq("id", solicitacaoId)
    .eq("aprovacao_token", token);

  if (decisao === "autorizar" && fornecedorId) {
    const pedidoNumero = `PED-${solicitacao.codigo ?? Date.now()}`;
    const { data: cotacao } = await supabase
      .from("cotacoes")
      .select("*, fornecedor:fornecedores(*), itens:cotacao_itens(*)")
      .eq("solicitacao_id", solicitacaoId)
      .eq("fornecedor_id", fornecedorId)
      .single();

    const pdfBytes = await generatePedidoCompraPdf({
      pedidoNumero,
      solicitacao,
      cotacao,
      gestor: {
        nome: gestorNome,
        email: gestorEmail,
        autorizadoAt: decidedAt,
      },
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
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 30);

    await supabase.from("pedidos").insert({
      cliente_id: clienteId,
      solicitacao_id: solicitacaoId,
      fornecedor_id: fornecedorId,
      numero: pedidoNumero,
      status: "emitido",
      valor_total: cotacao?.total_fornecedor ?? 0,
      pdf_path: pdfPath,
      pdf_url: signed?.signedUrl ?? null,
      autorizado_por_nome: gestorNome,
      autorizado_por_email: gestorEmail,
      autorizado_at: decidedAt,
      emitido_at: decidedAt,
    });
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
      fornecedor_id: fornecedorId,
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
  pedido_programado: ["pedido_enviado", "cancelada"],
  pedido_enviado: ["finalizada", "cancelada"],
};

export async function avancarFluxo(formData: FormData) {
  const { supabase, user, profile } = await getActor();
  const permissions = await getPermissionsForUser(profile.id);
  await assertPermission(profile.role, permissions, "solicitacoes.edit");
  const context = await getRequestContext();
  const solicitacaoId = text(formData, "solicitacao_id");
  const etapa = text(formData, "etapa");
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

  const updates: Record<string, string> = { status: etapa };

  if (etapa === "pedido_enviado") {
    updates.pedido_enviado_at = new Date().toISOString();
  }

  if (etapa === "finalizada") {
    updates.finalizada_at = new Date().toISOString();
  }

  if (etapa === "cancelada") {
    updates.cancelada_at = new Date().toISOString();
  }

  await supabase.from("solicitacoes").update(updates).eq("id", solicitacaoId);

  if (etapa === "pedido_enviado") {
    await supabase
      .from("pedidos")
      .update({ status: "enviado" })
      .eq("solicitacao_id", solicitacaoId);
  }

  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: user.id,
    entidade: "solicitacao",
    entidadeId: solicitacaoId!,
    acao: `fluxo_${etapa}`,
    statusAnterior: current.status,
    statusNovo: updates.status,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath(`/compras/${solicitacaoId}`);
}
