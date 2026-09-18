"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { money, text } from "@/lib/form-data";
import { getLinkedObrasForUser, isGestorRole } from "@/lib/permissions";
import { requireActor } from "@/lib/require-actor";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export type ServicoObraActionState = {
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

// --- Caçamba ---------------------------------------------------------

export async function createCacamba(
  _state: ServicoObraActionState,
  formData: FormData,
): Promise<ServicoObraActionState> {
  try {
    const profile = await requireActor("cacamba.create");
    const obraId = text(formData, "obra_id");
    const tipo = text(formData, "tipo") ?? "mista";
    const observacao = text(formData, "observacao");
    const orcamentoItemId = text(formData, "orcamento_item_id");
    const valor = money(formData.get("valor"));
    const dataPrevista = text(formData, "data_prevista");

    if (!obraId) {
      return { message: "Selecione a obra." };
    }

    if (!dataPrevista) {
      return { message: "Informe a data prevista de entrega." };
    }

    const isGestor = isGestorRole(profile.role);
    const obraError = await assertObraVinculada(isGestor, profile.id, obraId);
    if (obraError) {
      return { message: obraError };
    }

    const supabase = await createClient();
    // Entra "pendente" — só vira "solicitada" quando o compras enviar a
    // mensagem pro fornecedor (marcarMensagemCacambaEnviada).
    const { data: cacamba, error } = await supabase
      .from("cacambas")
      .insert({
        cliente_id: profile.cliente_id,
        obra_id: obraId,
        tipo,
        status: "pendente",
        observacao,
        criado_por: profile.id,
        orcamento_item_id: orcamentoItemId,
        valor,
        data_prevista: dataPrevista,
      })
      .select("id")
      .single();

    if (error || !cacamba) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível solicitar a caçamba.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "cacamba",
      entidadeId: cacamba.id,
      acao: "cacamba_solicitada",
      statusNovo: "pendente",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { obra_id: obraId, tipo, data_prevista: dataPrevista },
    });

    revalidatePath("/servicos/cacamba");
    return { success: true, message: "Caçamba solicitada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Centro de custo e valor costumam só ficar disponíveis depois (nota
// fiscal/fatura da caçambeira chega depois da solicitação) — por isso é
// uma edição separada, não só um campo no formulário de criação, e fica
// restrita a quem confirma (cacamba.confirm), não a quem só solicita.
export async function updateCacamba(
  _state: ServicoObraActionState,
  formData: FormData,
): Promise<ServicoObraActionState> {
  try {
    const profile = await requireActor("cacamba.confirm");
    const cacambaId = text(formData, "cacamba_id");
    const orcamentoItemId = text(formData, "orcamento_item_id");
    const valor = money(formData.get("valor"));

    if (!cacambaId) {
      return { message: "Caçamba inválida." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("cacambas")
      .update({
        orcamento_item_id: orcamentoItemId,
        valor,
      })
      .eq("id", cacambaId);

    if (error) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível salvar as alterações.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "cacamba",
      entidadeId: cacambaId,
      acao: "cacamba_orcamento_atualizado",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { orcamento_item_id: orcamentoItemId, valor },
    });

    revalidatePath("/servicos/cacamba");
    return { success: true, message: "Caçamba atualizada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Fornecedor é quem recebe a mensagem de solicitação/troca por WhatsApp —
// escolha do compras/adm, mesma permissão de updateCacamba (centro de
// custo/valor), não de quem só solicita a caçamba (cacamba.create).
export async function escolherFornecedorCacamba(
  _state: ServicoObraActionState,
  formData: FormData,
): Promise<ServicoObraActionState> {
  try {
    const profile = await requireActor("cacamba.confirm");
    const cacambaId = text(formData, "cacamba_id");
    const fornecedorId = text(formData, "fornecedor_id");

    if (!cacambaId) {
      return { message: "Caçamba inválida." };
    }

    const supabase = await createClient();
    // Troca de fornecedor invalida uma mensagem já enviada (foi pro
    // número errado) — zera pra exigir um novo envio antes de confirmar.
    const { error } = await supabase
      .from("cacambas")
      .update({
        fornecedor_id: fornecedorId || null,
        mensagem_enviada_em: null,
      })
      .eq("id", cacambaId);

    // Se ainda estava "solicitada" (ciclo de entrega inicial), volta pra
    // "pendente" — senão o botão "Confirmar entrega" continuava aparecendo
    // (ele só olha o status) mesmo sem mensagem_enviada_em, e confirmar
    // quebrava a página com um erro não tratado em inserirEventoCacamba.
    if (!error) {
      await supabase
        .from("cacambas")
        .update({ status: "pendente" })
        .eq("id", cacambaId)
        .eq("status", "solicitada");
    }

    if (error) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível salvar o fornecedor.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "cacamba",
      entidadeId: cacambaId,
      acao: "cacamba_fornecedor_definido",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { fornecedor_id: fornecedorId },
    });

    revalidatePath("/servicos/cacamba");
    return { success: true, message: "Fornecedor salvo." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Chamada direto no clique do botão "Enviar WhatsApp" (não é um <form>) —
// Server Actions do Next podem ser importadas e chamadas como função comum
// num Client Component, sem precisar de FormData.
export async function marcarMensagemCacambaEnviada(cacambaId: string) {
  await requireActor("cacamba.confirm");

  if (!cacambaId) {
    throw new Error("Caçamba inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cacambas")
    .update({ mensagem_enviada_em: new Date().toISOString() })
    .eq("id", cacambaId);

  if (error) {
    throw new Error(friendlyErrorMessage(error));
  }

  // Se ainda estava "pendente" (mensagem da solicitação inicial), passa
  // pra "solicitada" — já avisado o fornecedor, só falta a entrega na data
  // prevista. Uma mensagem de troca não mexe aqui: acao_pendente já é
  // quem representa esse estágio, o status continua "ativa".
  await supabase
    .from("cacambas")
    .update({ status: "solicitada" })
    .eq("id", cacambaId)
    .eq("status", "pendente");

  revalidatePath("/servicos/cacamba");
}

async function inserirEventoCacamba(
  permissao: "cacamba.create" | "cacamba.confirm",
  tipoEvento:
    | "entrega"
    | "pedido_troca"
    | "troca_confirmada"
    | "pedido_devolucao"
    | "devolucao_confirmada",
  formData: FormData,
  mensagemErroPadrao: string,
) {
  const profile = await requireActor(permissao);
  const cacambaId = text(formData, "cacamba_id");
  const dataPrevista = text(formData, "data_prevista");

  if (!cacambaId) {
    throw new Error("Caçamba inválida.");
  }

  // pedido_troca/pedido_devolucao precisam de uma nova data prevista —
  // mesma lógica da solicitação inicial, usada pelo lembrete automático.
  if (
    (tipoEvento === "pedido_troca" || tipoEvento === "pedido_devolucao") &&
    !dataPrevista
  ) {
    throw new Error("Informe a data prevista.");
  }

  const supabase = await createClient();

  // Confirmar entrega/troca só é permitido depois que a mensagem de
  // solicitação/troca foi enviada pro fornecedor pelo WhatsApp — evita
  // confirmar uma caçamba que o fornecedor nem sabe que precisa
  // entregar/trocar. pedido_troca/pedido_devolucao ficam de fora: são o
  // que CRIA a pendência que ainda vai gerar a mensagem, não o que a exige.
  if (tipoEvento === "entrega" || tipoEvento === "troca_confirmada") {
    const { data: cacamba } = await supabase
      .from("cacambas")
      .select("mensagem_enviada_em")
      .eq("id", cacambaId)
      .single();

    if (!cacamba?.mensagem_enviada_em) {
      throw new Error(
        "Envie a mensagem de WhatsApp pro fornecedor antes de confirmar.",
      );
    }
  }

  const { error } = await supabase.from("cacamba_eventos").insert({
    cliente_id: profile.cliente_id,
    cacamba_id: cacambaId,
    tipo: tipoEvento,
    responsavel_id: profile.id,
  });

  if (error) {
    throw new Error(friendlyErrorMessage(error, mensagemErroPadrao));
  }

  // Zera pra exigir um novo envio no próximo ciclo (ex: uma troca futura
  // vai pedir mensagem de novo, mesmo fornecedor ou não).
  if (tipoEvento === "entrega" || tipoEvento === "troca_confirmada") {
    await supabase
      .from("cacambas")
      .update({ mensagem_enviada_em: null })
      .eq("id", cacambaId);
  }

  // Nova data prevista pro pedido de troca/devolução que acabou de abrir.
  if (
    (tipoEvento === "pedido_troca" || tipoEvento === "pedido_devolucao") &&
    dataPrevista
  ) {
    await supabase
      .from("cacambas")
      .update({ data_prevista: dataPrevista })
      .eq("id", cacambaId);
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "cacamba",
    entidadeId: cacambaId,
    acao: `cacamba_${tipoEvento}`,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/servicos/cacamba");
}

// pedido_troca/pedido_devolucao: sempre "o gestor pedindo algo" — mesma
// permissão de criar a solicitação inicial.
export async function solicitarTrocaCacamba(formData: FormData) {
  await inserirEventoCacamba(
    "cacamba.create",
    "pedido_troca",
    formData,
    "Não foi possível pedir a troca.",
  );
}

export async function solicitarDevolucaoCacamba(formData: FormData) {
  await inserirEventoCacamba(
    "cacamba.create",
    "pedido_devolucao",
    formData,
    "Não foi possível pedir a devolução.",
  );
}

// entrega/troca_confirmada/devolucao_confirmada: sempre "o administrativo
// resolvendo" — mesma permissão de confirmar.
// Esses três botões chamam a action direto como `<form action={fn}>`, sem
// useActionState — não tem como devolver uma mensagem de erro pra tela.
// Se inserirEventoCacamba lançar (ex: mensagem ainda não enviada por causa
// de algum estado inconsistente), capturar aqui e só revalidar evita a
// página inteira quebrar com "Application error" — o pior caso vira "nada
// visível aconteceu" em vez de crash, e a tela recarrega já mostrando o
// estado real (inclusive o aviso de "envie a mensagem antes").
export async function confirmarEntregaCacamba(formData: FormData) {
  try {
    await inserirEventoCacamba(
      "cacamba.confirm",
      "entrega",
      formData,
      "Não foi possível confirmar a entrega.",
    );
  } catch {
    revalidatePath("/servicos/cacamba");
  }
}

export async function confirmarTrocaCacamba(formData: FormData) {
  try {
    await inserirEventoCacamba(
      "cacamba.confirm",
      "troca_confirmada",
      formData,
      "Não foi possível confirmar a troca.",
    );
  } catch {
    revalidatePath("/servicos/cacamba");
  }
}

export async function confirmarDevolucaoCacamba(formData: FormData) {
  try {
    await inserirEventoCacamba(
      "cacamba.confirm",
      "devolucao_confirmada",
      formData,
      "Não foi possível confirmar a devolução.",
    );
  } catch {
    revalidatePath("/servicos/cacamba");
  }
}

// --- Desmobilização ----------------------------------------------------

export async function createDesmobilizacao(
  _state: ServicoObraActionState,
  formData: FormData,
): Promise<ServicoObraActionState> {
  try {
    const profile = await requireActor("desmobilizacao.create");
    const obraId = text(formData, "obra_id");
    const dataDesmobilizacao = text(formData, "data_desmobilizacao");
    const observacao = text(formData, "observacao");

    if (!obraId) {
      return { message: "Selecione a obra." };
    }

    if (!dataDesmobilizacao) {
      return { message: "Informe a data da desmobilização." };
    }

    const isGestor = isGestorRole(profile.role);
    const obraError = await assertObraVinculada(isGestor, profile.id, obraId);
    if (obraError) {
      return { message: obraError };
    }

    const supabase = await createClient();
    const { data: solicitacao, error } = await supabase
      .from("solicitacoes_desmobilizacao")
      .insert({
        cliente_id: profile.cliente_id,
        obra_id: obraId,
        data_desmobilizacao: dataDesmobilizacao,
        observacao,
        criado_por: profile.id,
      })
      .select("id")
      .single();

    if (error || !solicitacao) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível solicitar a desmobilização.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "solicitacao_desmobilizacao",
      entidadeId: solicitacao.id,
      acao: "desmobilizacao_solicitada",
      statusNovo: "pendente",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { obra_id: obraId, data_desmobilizacao: dataDesmobilizacao },
    });

    revalidatePath("/servicos/desmobilizacao");
    return { success: true, message: "Desmobilização solicitada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function confirmarDesmobilizacao(formData: FormData) {
  const profile = await requireActor("desmobilizacao.confirm");
  const id = text(formData, "id");

  if (!id) {
    throw new Error("Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitacoes_desmobilizacao")
    .update({
      status: "concluida",
      concluido_por: profile.id,
      concluido_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      friendlyErrorMessage(
        error,
        "Não foi possível concluir a desmobilização.",
      ),
    );
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "solicitacao_desmobilizacao",
    entidadeId: id,
    acao: "desmobilizacao_concluida",
    statusNovo: "concluida",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/servicos/desmobilizacao");
}
