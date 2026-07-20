"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export type FerramentaActionState = {
  message?: string;
  success?: boolean;
};

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

    const supabase = (await createClient()) as any;
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

  const supabase = (await createClient()) as any;
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

  const supabase = (await createClient()) as any;
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
