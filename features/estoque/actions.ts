"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { money, text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export type EstoqueActionState = {
  message?: string;
  success?: boolean;
};

export async function registrarEntradaEstoque(
  _state: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  try {
    const profile = await requireActor("estoque.entrada.create");
    const itemId = text(formData, "item_id");
    const quantidade = money(formData.get("quantidade"));
    const motivo = text(formData, "motivo");

    if (!itemId) {
      return { message: "Selecione um insumo." };
    }

    if (quantidade == null || quantidade <= 0) {
      return { message: "Informe uma quantidade maior que zero." };
    }

    const supabase = (await createClient()) as any;

    const { data: estoqueItem, error: upsertError } = await supabase
      .from("estoque_itens")
      .upsert(
        { cliente_id: profile.cliente_id, item_id: itemId },
        { onConflict: "cliente_id,item_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (upsertError || !estoqueItem) {
      return {
        message: friendlyErrorMessage(
          upsertError,
          "Não foi possível registrar o item no estoque.",
        ),
      };
    }

    const { error: movError } = await supabase
      .from("movimentacoes_estoque")
      .insert({
        cliente_id: profile.cliente_id,
        estoque_item_id: estoqueItem.id,
        tipo: "entrada",
        quantidade,
        motivo,
        responsavel_id: profile.id,
      });

    if (movError) {
      return {
        message: friendlyErrorMessage(
          movError,
          "Não foi possível registrar a entrada.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "estoque_item",
      entidadeId: estoqueItem.id,
      acao: "entrada_registrada",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { item_id: itemId, quantidade, motivo },
    });

    revalidatePath("/estoque");
    return { success: true, message: "Entrada registrada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

// Retirada manual de estoque, sem vínculo com uma solicitação de compra
// (ex.: consumo direto de um insumo já em depósito). Diferente da baixa
// feita em confirmarSeparacao, que só acontece via requisição do Compras.
export async function registrarSaidaEstoque(
  _state: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  try {
    const profile = await requireActor("estoque.saida.create");
    const itemId = text(formData, "item_id");
    const obraId = text(formData, "obra_id");
    const quantidade = money(formData.get("quantidade"));
    const motivo = text(formData, "motivo");

    if (!itemId) {
      return { message: "Selecione um insumo." };
    }

    if (!obraId) {
      return { message: "Selecione a obra de destino." };
    }

    if (quantidade == null || quantidade <= 0) {
      return { message: "Informe uma quantidade maior que zero." };
    }

    const supabase = (await createClient()) as any;

    const { data: saldo } = await supabase
      .from("v_estoque_saldo")
      .select("estoque_item_id,quantidade_atual")
      .eq("item_id", itemId)
      .maybeSingle();

    if (!saldo || Number(saldo.quantidade_atual) <= 0) {
      return { message: "Este insumo não tem saldo em estoque." };
    }

    if (quantidade > Number(saldo.quantidade_atual)) {
      return {
        message: `Só há ${Number(saldo.quantidade_atual).toLocaleString("pt-BR")} disponível em estoque.`,
      };
    }

    const { error: movError } = await supabase
      .from("movimentacoes_estoque")
      .insert({
        cliente_id: profile.cliente_id,
        estoque_item_id: saldo.estoque_item_id,
        tipo: "saida",
        quantidade,
        motivo,
        obra_id: obraId,
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

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "estoque_item",
      entidadeId: saldo.estoque_item_id,
      acao: "saida_registrada",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: { item_id: itemId, obra_id: obraId, quantidade, motivo },
    });

    revalidatePath("/estoque");
    return { success: true, message: "Saída registrada." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function confirmarSeparacao(formData: FormData) {
  const profile = await requireActor("estoque.requisicao.confirm");
  const requisicaoId = text(formData, "requisicao_id");

  if (!requisicaoId) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;

  const { data: requisicao } = await supabase
    .from("requisicoes_almox")
    .select(
      "id,solicitacao_id,obra_id,status,itens:requisicao_almox_itens(id,quantidade_solicitada,estoque_item_id,solicitacao_item_id)",
    )
    .eq("id", requisicaoId)
    .single();

  if (!requisicao) {
    throw new Error("Requisição não encontrada.");
  }

  if (requisicao.status === "separado") {
    throw new Error("Esta requisição já foi separada.");
  }

  let houveDivergencia = false;
  const separadoAt = new Date().toISOString();

  for (const item of requisicao.itens ?? []) {
    const quantidadeSeparadaInput = money(
      formData.get(`quantidade_separada_${item.id}`),
    );
    const quantidadeSeparada =
      quantidadeSeparadaInput ?? item.quantidade_solicitada;

    if (
      quantidadeSeparada <= 0 ||
      quantidadeSeparada > item.quantidade_solicitada
    ) {
      throw new Error(
        "Quantidade separada inválida — não pode ser maior que a solicitada.",
      );
    }

    await supabase
      .from("requisicao_almox_itens")
      .update({ quantidade_separada: quantidadeSeparada })
      .eq("id", item.id);

    if (quantidadeSeparada > 0) {
      await supabase.from("movimentacoes_estoque").insert({
        cliente_id: profile.cliente_id,
        estoque_item_id: item.estoque_item_id,
        tipo: "saida",
        quantidade: quantidadeSeparada,
        motivo: "Requisição de compra separada pelo almoxarifado",
        solicitacao_id: requisicao.solicitacao_id,
        obra_id: requisicao.obra_id,
        responsavel_id: profile.id,
      });
    }

    const shortfall = Number(item.quantidade_solicitada) - quantidadeSeparada;
    if (shortfall > 0) {
      houveDivergencia = true;

      const { data: solicitacaoItem } = await supabase
        .from("solicitacao_itens")
        .select("quantidade_estoque")
        .eq("id", item.solicitacao_item_id)
        .single();

      if (solicitacaoItem) {
        await supabase
          .from("solicitacao_itens")
          .update({
            quantidade_estoque:
              Number(solicitacaoItem.quantidade_estoque) - shortfall,
          })
          .eq("id", item.solicitacao_item_id);
      }
    }
  }

  await supabase
    .from("requisicoes_almox")
    .update({
      status: "separado",
      separado_por: profile.id,
      separado_at: separadoAt,
    })
    .eq("id", requisicaoId);

  if (houveDivergencia) {
    await supabase
      .from("solicitacoes")
      .update({ divergencia_estoque_at: separadoAt })
      .eq("id", requisicao.solicitacao_id);
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "requisicao_almox",
    entidadeId: requisicaoId,
    acao: houveDivergencia
      ? "separacao_confirmada_com_divergencia"
      : "separacao_confirmada",
    statusAnterior: "pendente",
    statusNovo: "separado",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/estoque/requisicoes");
  revalidatePath(`/estoque/requisicoes/${requisicaoId}`);
  revalidatePath(`/compras/${requisicao.solicitacao_id}`);
  redirect("/estoque/requisicoes");
}
