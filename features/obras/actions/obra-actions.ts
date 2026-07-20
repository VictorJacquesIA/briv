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
  const gestorId = text(formData, "gestor_id");

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
      telefone_responsavel: text(formData, "telefone_responsavel"),
    })
    .select("id")
    .single();

  if (error || !obra) {
    return {
      message: friendlyErrorMessage(error, "Não foi possível criar a obra."),
    };
  }

  if (gestorId) {
    await supabase.from("obra_usuarios").insert({
      obra_id: obra.id,
      user_id: gestorId,
      papel_na_obra: "gestor",
      ativo: true,
    });
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

const FASE_VALUES = ["fase_1", "fase_2", "fase_3", "concluida"];

// Ação dedicada (só troca a fase) em vez de reusar updateObra, que
// sobrescreveria nome/código/endereço/responsável com null se chamada com um
// form parcial — updateObra hoje não é usada em nenhuma tela.
export async function updateObraFase(formData: FormData) {
  const profile = await requireActor("obras.edit");
  const obraId = text(formData, "obra_id");
  const fase = text(formData, "fase");

  if (!obraId || !fase || !FASE_VALUES.includes(fase)) {
    throw new Error("Fase inválida.");
  }

  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("obras")
    .update({ fase })
    .eq("id", obraId);

  if (error) {
    throw new Error("Não foi possível atualizar a fase da obra.");
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "obra",
    entidadeId: obraId,
    acao: "obra_fase_alterada",
    statusNovo: fase,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
}

// Escolher o gestor pela própria obra troca o vínculo de acesso
// (obra_usuarios) — remove qualquer gestor vinculado antes e vincula o
// escolhido (ou deixa sem gestor, se nenhum for selecionado). Isso é o que
// efetivamente controla o acesso do gestor_obra àquela obra em todo o
// sistema (compras, pagamento MO, contratos, estoque), diferente do campo
// solto "Responsável" da obra.
export async function updateObraGestor(formData: FormData) {
  const profile = await requireActor("obras.edit");
  const obraId = text(formData, "obra_id");
  const gestorId = text(formData, "gestor_id");

  if (!obraId) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;

  await supabase.from("obra_usuarios").delete().eq("obra_id", obraId);

  if (gestorId) {
    const { error } = await supabase.from("obra_usuarios").insert({
      obra_id: obraId,
      user_id: gestorId,
      papel_na_obra: "gestor",
      ativo: true,
    });

    if (error) {
      throw new Error("Não foi possível vincular o gestor à obra.");
    }
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "obra",
    entidadeId: obraId,
    acao: "obra_gestor_alterado",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: { gestor_id: gestorId ?? undefined },
  });

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
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
