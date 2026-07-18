"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export type ObraActionState = {
  message?: string;
};

export async function createObra(
  _state: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const profile = await requireActor("obras.create");
  const nome = text(formData, "nome");

  if (!nome) {
    return { message: "Informe o nome da obra." };
  }

  const supabase = (await createClient()) as any;
  const { data: obra, error } = await supabase
    .from("obras")
    .insert({
      cliente_id: profile.cliente_id,
      nome,
      codigo: text(formData, "codigo"),
      endereco: text(formData, "endereco"),
      fase: text(formData, "fase") ?? "fase_1",
      responsavel_id: text(formData, "responsavel_id"),
      telefone_responsavel: text(formData, "telefone_responsavel"),
    })
    .select("id")
    .single();

  if (error || !obra) {
    return {
      message: friendlyErrorMessage(error, "Não foi possível criar a obra."),
    };
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "obra",
    entidadeId: obra.id,
    acao: "obra_criada",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: { nome },
  });

  revalidatePath("/obras");
  redirect(`/obras/${obra.id}`);
}

export async function updateObra(formData: FormData) {
  const profile = await requireActor("obras.edit");
  const obraId = text(formData, "obra_id");

  if (!obraId) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("obras")
    .update({
      nome: text(formData, "nome"),
      codigo: text(formData, "codigo"),
      endereco: text(formData, "endereco"),
      fase: text(formData, "fase") ?? "fase_1",
      responsavel_id: text(formData, "responsavel_id"),
      telefone_responsavel: text(formData, "telefone_responsavel"),
    })
    .eq("id", obraId);

  if (error) {
    throw new Error("Não foi possível atualizar a obra.");
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "obra",
    entidadeId: obraId,
    acao: "obra_atualizada",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath(`/obras/${obraId}`);
}

export async function createOrcamentoItem(formData: FormData) {
  const profile = await requireActor("obras.orcamento.edit");
  const obraId = text(formData, "obra_id");
  const descricao = text(formData, "descricao");
  const tipo = text(formData, "tipo");
  const valorOrcado = Number(
    String(formData.get("valor_orcado") ?? "0").replace(",", "."),
  );

  if (!obraId || !descricao || !Number.isFinite(valorOrcado)) {
    throw new Error("Dados inválidos.");
  }

  if (tipo !== "insumos" && tipo !== "mao_de_obra") {
    throw new Error(
      "Selecione o tipo do item de orçamento (Insumos ou Mão de Obra).",
    );
  }

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("obra_orcamento_itens")
    .insert({
      obra_id: obraId,
      cliente_id: profile.cliente_id,
      descricao,
      categoria: text(formData, "categoria"),
      tipo,
      valor_orcado: valorOrcado,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error("Não foi possível criar o item de orçamento.");
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "obra",
    entidadeId: obraId,
    acao: "orcamento_item_criado",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: {
      orcamento_item_id: data?.id,
      descricao,
      tipo,
      valor_orcado: valorOrcado,
    },
  });

  revalidatePath(`/obras/${obraId}`);
}

export async function deleteOrcamentoItem(formData: FormData) {
  const profile = await requireActor("obras.orcamento.edit");
  const obraId = text(formData, "obra_id");
  const itemId = text(formData, "orcamento_item_id");

  if (!obraId || !itemId) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;
  await supabase.from("obra_orcamento_itens").delete().eq("id", itemId);

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "obra",
    entidadeId: obraId,
    acao: "orcamento_item_removido",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: { orcamento_item_id: itemId },
  });

  revalidatePath(`/obras/${obraId}`);
}
