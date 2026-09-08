"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { money, text } from "@/lib/form-data";
import { getLinkedObrasForUser, isGestorRole } from "@/lib/permissions";
import { requireActor } from "@/lib/require-actor";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export type FerramentaActionState = {
  message?: string;
  success?: boolean;
};

async function assertObraVinculada(
  isGestor: boolean,
  profileId: string,
  obraId: string,
) {
  if (!isGestor) {
    return null;
  }

  const linkedObras = await getLinkedObrasForUser(profileId);
  if (!linkedObras.includes(obraId)) {
    return "Você não tem permissão para essa obra.";
  }

  return null;
}

export async function createFerramenta(
  _state: FerramentaActionState,
  formData: FormData,
): Promise<FerramentaActionState> {
  try {
    const profile = await requireActor("ferramentas.create");
    const nome = text(formData, "nome");

    if (!nome) {
      return { message: "Informe o nome da ferramenta." };
    }

    const supabase = await createClient();
    const { data: ferramenta, error } = await supabase
      .from("ferramentas")
      .insert({
        cliente_id: profile.cliente_id,
        nome,
        codigo: text(formData, "codigo"),
      })
      .select("id")
      .single();

    if (error || !ferramenta) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível cadastrar a ferramenta.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "ferramenta",
      entidadeId: ferramenta.id,
      acao: "criada",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { nome },
    });

    revalidatePath("/estoque/ferramentas");
    return { success: true, message: "Ferramenta cadastrada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Usadas como <form action={...}> direto (sem useActionState) na listagem
// de ferramentas — por isso recebem só FormData e lançam erro em vez de
// devolver estado, mesmo padrão de confirmarLancamento/darBaixaVale.
export async function registrarSaidaFerramenta(formData: FormData) {
  const profile = await requireActor("ferramentas.saida.create");
  const ferramentaId = text(formData, "ferramenta_id");
  const obraId = text(formData, "obra_id");
  const observacao = text(formData, "observacao");

  if (!ferramentaId || !obraId) {
    throw new Error("Selecione a obra de destino.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("movimentacoes_ferramentas").insert({
    cliente_id: profile.cliente_id,
    ferramenta_id: ferramentaId,
    tipo: "saida",
    obra_id: obraId,
    responsavel_id: profile.id,
    observacao,
  });

  if (error) {
    throw new Error(
      friendlyErrorMessage(error, "Não foi possível registrar a saída."),
    );
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "ferramenta",
    entidadeId: ferramentaId,
    acao: "saida_registrada",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: { obra_id: obraId, observacao },
  });

  revalidatePath("/estoque/ferramentas");
}

// A obra de origem é derivada do estado atual da ferramenta (obra_atual_id),
// nunca aceita do formulário — evita que um valor adulterado registre uma
// devolução de uma obra errada.
export async function registrarEntradaFerramenta(formData: FormData) {
  const profile = await requireActor("ferramentas.entrada.create");
  const ferramentaId = text(formData, "ferramenta_id");
  const observacao = text(formData, "observacao");

  if (!ferramentaId) {
    throw new Error("Ferramenta inválida.");
  }

  const supabase = await createClient();
  const { data: ferramenta } = await supabase
    .from("ferramentas")
    .select("status,obra_atual_id")
    .eq("id", ferramentaId)
    .maybeSingle();

  if (
    !ferramenta ||
    ferramenta.status !== "emprestada" ||
    !ferramenta.obra_atual_id
  ) {
    throw new Error("Esta ferramenta não está emprestada no momento.");
  }

  const { error } = await supabase.from("movimentacoes_ferramentas").insert({
    cliente_id: profile.cliente_id,
    ferramenta_id: ferramentaId,
    tipo: "entrada",
    obra_id: ferramenta.obra_atual_id,
    responsavel_id: profile.id,
    observacao,
  });

  if (error) {
    throw new Error(
      friendlyErrorMessage(error, "Não foi possível registrar a devolução."),
    );
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "ferramenta",
    entidadeId: ferramentaId,
    acao: "entrada_registrada",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: { obra_id: ferramenta.obra_atual_id, observacao },
  });

  revalidatePath("/estoque/ferramentas");
}

// --- Solicitação de ferramenta (gestor pede, compras decide) -----------

export async function solicitarFerramenta(
  _state: FerramentaActionState,
  formData: FormData,
): Promise<FerramentaActionState> {
  try {
    const profile = await requireActor("ferramentas.solicitacao.create");
    const obraId = text(formData, "obra_id");
    const descricao = text(formData, "descricao");
    const observacao = text(formData, "observacao");
    const dataNecessidade = text(formData, "data_necessidade");

    if (!obraId) {
      return { message: "Selecione a obra." };
    }

    if (!descricao) {
      return { message: "Descreva a ferramenta que precisa." };
    }

    if (!dataNecessidade) {
      return { message: "Informe a data que precisa da ferramenta." };
    }

    const isGestor = isGestorRole(profile.role);
    const obraError = await assertObraVinculada(isGestor, profile.id, obraId);
    if (obraError) {
      return { message: obraError };
    }

    const supabase = await createClient();
    const { data: solicitacao, error } = await supabase
      .from("ferramenta_solicitacoes")
      .insert({
        cliente_id: profile.cliente_id,
        obra_id: obraId,
        descricao,
        observacao,
        data_necessidade: dataNecessidade,
        solicitado_por: profile.id,
      })
      .select("id")
      .single();

    if (error || !solicitacao) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível solicitar a ferramenta.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "ferramenta_solicitacao",
      entidadeId: solicitacao.id,
      acao: "ferramenta_solicitada",
      statusNovo: "pendente",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { obra_id: obraId, descricao, data_necessidade: dataNecessidade },
    });

    revalidatePath("/servicos/ferramentas");
    return { success: true, message: "Ferramenta solicitada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Compras decide mandar uma ferramenta já existente no depósito — a saída
// segue o fluxo normal (registrarSaidaFerramenta já faz o trigger mudar o
// status pra "emprestada"), só que aqui a solicitação do gestor é
// encerrada junto.
export async function decidirFerramentaDeposito(
  _state: FerramentaActionState,
  formData: FormData,
): Promise<FerramentaActionState> {
  try {
    const profile = await requireActor("ferramentas.solicitacao.decide");
    const solicitacaoId = text(formData, "solicitacao_id");
    const ferramentaId = text(formData, "ferramenta_id");

    if (!solicitacaoId || !ferramentaId) {
      return { message: "Selecione a ferramenta do depósito." };
    }

    const supabase = await createClient();
    const { data: solicitacao } = await supabase
      .from("ferramenta_solicitacoes")
      .select("obra_id,status")
      .eq("id", solicitacaoId)
      .single();

    if (!solicitacao || solicitacao.status !== "pendente") {
      return { message: "Solicitação inválida ou já atendida." };
    }

    const { data: ferramenta } = await supabase
      .from("ferramentas")
      .select("status")
      .eq("id", ferramentaId)
      .single();

    if (!ferramenta || ferramenta.status !== "deposito") {
      return { message: "Esta ferramenta não está disponível no depósito." };
    }

    const { error: movError } = await supabase
      .from("movimentacoes_ferramentas")
      .insert({
        cliente_id: profile.cliente_id,
        ferramenta_id: ferramentaId,
        tipo: "saida",
        obra_id: solicitacao.obra_id,
        responsavel_id: profile.id,
      });

    if (movError) {
      return {
        message: friendlyErrorMessage(
          movError,
          "Não foi possível registrar a saída.",
        ),
      };
    }

    const { error: updateError } = await supabase
      .from("ferramenta_solicitacoes")
      .update({
        status: "atendida",
        decisao: "deposito",
        ferramenta_id: ferramentaId,
        atendido_por: profile.id,
        atendido_at: new Date().toISOString(),
      })
      .eq("id", solicitacaoId);

    if (updateError) {
      return {
        message: friendlyErrorMessage(
          updateError,
          "Não foi possível atualizar a solicitação.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "ferramenta_solicitacao",
      entidadeId: solicitacaoId,
      acao: "ferramenta_atendida_deposito",
      statusNovo: "atendida",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { ferramenta_id: ferramentaId },
    });

    revalidatePath("/servicos/ferramentas");
    revalidatePath("/estoque/ferramentas");
    return { success: true, message: "Ferramenta enviada do depósito." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Compras decide locar de um fornecedor externo — cria uma ferramenta nova
// (nasce "locada", já vinculada à obra) e encerra a solicitação. A entrega
// só pode ser confirmada depois que a mensagem de WhatsApp for enviada
// (marcarMensagemFerramentaEnviada + confirmarEntregaFerramentaLocada).
export async function decidirFerramentaLocacao(
  _state: FerramentaActionState,
  formData: FormData,
): Promise<FerramentaActionState> {
  try {
    const profile = await requireActor("ferramentas.solicitacao.decide");
    const solicitacaoId = text(formData, "solicitacao_id");
    const fornecedorId = text(formData, "fornecedor_id");
    const valorLocacao = money(formData.get("valor_locacao"));
    const dataPrevistaDevolucao = text(formData, "data_prevista_devolucao");

    if (!solicitacaoId || !fornecedorId) {
      return { message: "Selecione o fornecedor da locação." };
    }

    if (!dataPrevistaDevolucao) {
      return { message: "Informe a data prevista de devolução." };
    }

    const supabase = await createClient();
    const { data: solicitacao } = await supabase
      .from("ferramenta_solicitacoes")
      .select("obra_id,descricao,status")
      .eq("id", solicitacaoId)
      .single();

    if (!solicitacao || solicitacao.status !== "pendente") {
      return { message: "Solicitação inválida ou já atendida." };
    }

    const { data: ferramenta, error: ferramentaError } = await supabase
      .from("ferramentas")
      .insert({
        cliente_id: profile.cliente_id,
        nome: solicitacao.descricao,
        status: "locada",
        obra_atual_id: solicitacao.obra_id,
        fornecedor_id: fornecedorId,
        valor_locacao: valorLocacao,
        data_prevista_devolucao: dataPrevistaDevolucao,
      })
      .select("id")
      .single();

    if (ferramentaError || !ferramenta) {
      return {
        message: friendlyErrorMessage(
          ferramentaError,
          "Não foi possível registrar a locação.",
        ),
      };
    }

    const { error: updateError } = await supabase
      .from("ferramenta_solicitacoes")
      .update({
        status: "atendida",
        decisao: "locacao",
        ferramenta_id: ferramenta.id,
        atendido_por: profile.id,
        atendido_at: new Date().toISOString(),
      })
      .eq("id", solicitacaoId);

    if (updateError) {
      return {
        message: friendlyErrorMessage(
          updateError,
          "Não foi possível atualizar a solicitação.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "ferramenta_solicitacao",
      entidadeId: solicitacaoId,
      acao: "ferramenta_atendida_locacao",
      statusNovo: "atendida",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: {
        ferramenta_id: ferramenta.id,
        fornecedor_id: fornecedorId,
        valor_locacao: valorLocacao,
        data_prevista_devolucao: dataPrevistaDevolucao,
      },
    });

    revalidatePath("/servicos/ferramentas");
    revalidatePath("/estoque/ferramentas");
    return { success: true, message: "Locação registrada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Chamada direto no clique do botão "Enviar WhatsApp" (Server Action
// invocada como função comum num Client Component, sem FormData) — mesmo
// padrão de marcarMensagemCacambaEnviada.
export async function marcarMensagemFerramentaEnviada(ferramentaId: string) {
  await requireActor("ferramentas.solicitacao.decide");

  if (!ferramentaId) {
    throw new Error("Ferramenta inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ferramentas")
    .update({ mensagem_enviada_em: new Date().toISOString() })
    .eq("id", ferramentaId);

  if (error) {
    throw new Error(friendlyErrorMessage(error));
  }

  revalidatePath("/servicos/ferramentas");
  revalidatePath("/estoque/ferramentas");
}

// Confirmar entrega só é permitido depois que a mensagem foi enviada —
// mesmo gate da caçamba.
export async function confirmarEntregaFerramentaLocada(formData: FormData) {
  const profile = await requireActor("ferramentas.solicitacao.decide");
  const ferramentaId = text(formData, "ferramenta_id");

  if (!ferramentaId) {
    throw new Error("Ferramenta inválida.");
  }

  const supabase = await createClient();
  const { data: ferramenta } = await supabase
    .from("ferramentas")
    .select("status,mensagem_enviada_em")
    .eq("id", ferramentaId)
    .single();

  if (!ferramenta || ferramenta.status !== "locada") {
    throw new Error("Esta ferramenta não está em processo de locação.");
  }

  if (!ferramenta.mensagem_enviada_em) {
    throw new Error(
      "Envie a mensagem de WhatsApp pro fornecedor antes de confirmar.",
    );
  }

  const { error } = await supabase
    .from("ferramentas")
    .update({ entregue_em: new Date().toISOString() })
    .eq("id", ferramentaId);

  if (error) {
    throw new Error(
      friendlyErrorMessage(error, "Não foi possível confirmar a entrega."),
    );
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "ferramenta",
    entidadeId: ferramentaId,
    acao: "locacao_entrega_confirmada",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/servicos/ferramentas");
  revalidatePath("/estoque/ferramentas");
}

// Encerra a locação: a ferramenta sai da operação (ativo = false), igual
// um soft-delete — mantém histórico sem aparecer mais nas listagens.
export async function confirmarDevolucaoFerramentaLocada(formData: FormData) {
  const profile = await requireActor("ferramentas.solicitacao.decide");
  const ferramentaId = text(formData, "ferramenta_id");

  if (!ferramentaId) {
    throw new Error("Ferramenta inválida.");
  }

  const supabase = await createClient();
  const { data: ferramenta } = await supabase
    .from("ferramentas")
    .select("status,entregue_em")
    .eq("id", ferramentaId)
    .single();

  if (
    !ferramenta ||
    ferramenta.status !== "locada" ||
    !ferramenta.entregue_em
  ) {
    throw new Error("Esta ferramenta ainda não teve a entrega confirmada.");
  }

  const { error } = await supabase
    .from("ferramentas")
    .update({ ativo: false })
    .eq("id", ferramentaId);

  if (error) {
    throw new Error(
      friendlyErrorMessage(error, "Não foi possível confirmar a devolução."),
    );
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "ferramenta",
    entidadeId: ferramentaId,
    acao: "locacao_devolucao_confirmada",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/servicos/ferramentas");
  revalidatePath("/estoque/ferramentas");
}
