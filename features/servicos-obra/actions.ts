"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { text } from "@/lib/form-data";
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

    if (!obraId) {
      return { message: "Selecione a obra." };
    }

    const isGestor = isGestorRole(profile.role);
    const obraError = await assertObraVinculada(isGestor, profile.id, obraId);
    if (obraError) {
      return { message: obraError };
    }

    const supabase = (await createClient()) as any;
    const { data: cacamba, error } = await supabase
      .from("cacambas")
      .insert({
        cliente_id: profile.cliente_id,
        obra_id: obraId,
        tipo,
        observacao,
        criado_por: profile.id,
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
      statusNovo: "solicitada",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { obra_id: obraId, tipo },
    });

    revalidatePath("/servicos/cacamba");
    return { success: true, message: "Caçamba solicitada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
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

  if (!cacambaId) {
    throw new Error("Caçamba inválida.");
  }

  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("cacamba_eventos").insert({
    cliente_id: profile.cliente_id,
    cacamba_id: cacambaId,
    tipo: tipoEvento,
    responsavel_id: profile.id,
  });

  if (error) {
    throw new Error(friendlyErrorMessage(error, mensagemErroPadrao));
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
export async function confirmarEntregaCacamba(formData: FormData) {
  await inserirEventoCacamba(
    "cacamba.confirm",
    "entrega",
    formData,
    "Não foi possível confirmar a entrega.",
  );
}

export async function confirmarTrocaCacamba(formData: FormData) {
  await inserirEventoCacamba(
    "cacamba.confirm",
    "troca_confirmada",
    formData,
    "Não foi possível confirmar a troca.",
  );
}

export async function confirmarDevolucaoCacamba(formData: FormData) {
  await inserirEventoCacamba(
    "cacamba.confirm",
    "devolucao_confirmada",
    formData,
    "Não foi possível confirmar a devolução.",
  );
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

    const supabase = (await createClient()) as any;
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

  const supabase = (await createClient()) as any;
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
