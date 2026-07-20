"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getLinkedObrasForUser, isGestorRole } from "@/lib/permissions";
import { friendlyErrorMessage } from "@/lib/error-message";
import { money, text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";

export type MoActionState = {
  message?: string;
  id?: string;
  nome?: string;
};

export async function createLancamento(
  _state: MoActionState,
  formData: FormData,
): Promise<MoActionState> {
  try {
    const profile = await requireActor("pagamento_mo.create");
    const contratoId = text(formData, "contrato_id");
    let obraId = text(formData, "obra_id");
    let colaboradorId = text(formData, "colaborador_id");
    let tipo = text(formData, "tipo") ?? "solicitacao";
    const orcamentoItemId = text(formData, "orcamento_item_id");
    const descricao = text(formData, "descricao");

    const valorInput = money(formData.get("valor"));
    const qtdDiarias = money(formData.get("qtd_diarias"));
    const valorDiaria = money(formData.get("valor_diaria"));
    const usingDiarias = qtdDiarias != null;

    const supabaseCheck = (await createClient()) as any;
    let contratoSaldoRestante: number | null = null;

    // Parcela de contrato: obra/colaborador/tipo vêm do contrato no banco,
    // nunca do que o cliente mandou (evita adulteração via campos ocultos).
    if (contratoId) {
      const { data: contrato } = await supabaseCheck
        .from("v_contrato_mo_saldo")
        .select("obra_id,colaborador_id,status,saldo_restante")
        .eq("contrato_id", contratoId)
        .maybeSingle();

      if (!contrato) {
        return { message: "Contrato não encontrado." };
      }

      if (contrato.status === "quitado") {
        return { message: "Este contrato já está quitado." };
      }

      if (usingDiarias) {
        return {
          message: "Pagamento de contrato usa valor fechado, não diárias.",
        };
      }

      obraId = contrato.obra_id;
      colaboradorId = contrato.colaborador_id;
      tipo = "solicitacao";
      contratoSaldoRestante = Number(contrato.saldo_restante);
    }

    if (!obraId || !colaboradorId) {
      return { message: "Preencha obra e colaborador." };
    }

    if (usingDiarias && valorInput != null) {
      return { message: "Preencha valor OU diárias, não os dois." };
    }

    if (!usingDiarias && (valorInput == null || valorInput <= 0)) {
      return { message: "Informe o valor ou as diárias." };
    }

    if (usingDiarias && qtdDiarias <= 0) {
      return { message: "A quantidade de diárias deve ser maior que zero." };
    }

    if (usingDiarias && valorDiaria != null && valorDiaria <= 0) {
      return { message: "O valor da diária deve ser maior que zero." };
    }

    if (
      contratoId &&
      valorInput != null &&
      contratoSaldoRestante != null &&
      valorInput > contratoSaldoRestante
    ) {
      return {
        message: `Valor excede o saldo restante do contrato (R$ ${contratoSaldoRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
      };
    }

    const isGestor = isGestorRole(profile.role);

    // Gestor de obra lança só a quantidade de diárias — não sabe (e não deve
    // arbitrar) o valor da diária; quem finaliza com os valores é
    // compras/adm_geral na confirmação do pagamento.
    if (usingDiarias && isGestor && valorDiaria != null) {
      return { message: "Gestor de obra não informa o valor da diária." };
    }

    let valor: number | null = valorInput;
    if (usingDiarias) {
      valor =
        valorDiaria != null
          ? Number((qtdDiarias * valorDiaria).toFixed(2))
          : null;
    }

    // Gestor de obra pode lançar qualquer tipo (pagamento de mão de obra,
    // reembolso ou vale), mas só na obra vinculada a ele — a RLS reforça
    // isso, mas validar aqui dá uma mensagem de erro clara em vez de um
    // erro genérico do banco.
    if (isGestor) {
      const linkedObras = await getLinkedObrasForUser(profile.id);
      if (!linkedObras.includes(obraId)) {
        return {
          message: "Você não tem permissão para lançar mão de obra nesta obra.",
        };
      }
    }

    // Gestor de obra não define centro de custo — isso fica pro
    // compras/adm_geral preencher na confirmação do pagamento.
    if (tipo === "solicitacao" && !isGestor && !orcamentoItemId) {
      return { message: "Selecione o centro de custo." };
    }

    const supabase = (await createClient()) as any;
    const { data: lancamento, error } = await supabase
      .from("lancamentos_mo")
      .insert({
        cliente_id: profile.cliente_id,
        colaborador_id: colaboradorId,
        obra_id: obraId,
        orcamento_item_id: tipo === "solicitacao" ? orcamentoItemId : null,
        tipo,
        valor,
        qtd_diarias: usingDiarias ? qtdDiarias : null,
        valor_diaria: usingDiarias ? valorDiaria : null,
        descricao,
        criado_por: profile.id,
        contrato_id: contratoId ?? null,
      })
      .select("id")
      .single();

    if (error || !lancamento) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível criar o lançamento.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "lancamento_mo",
      entidadeId: lancamento.id,
      acao: "lancamento_criado",
      statusNovo: "pendente",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: {
        tipo,
        valor,
        colaborador_id: colaboradorId,
        obra_id: obraId,
        contrato_id: contratoId ?? undefined,
      },
    });

    revalidatePath("/pagamento-mo");
    if (contratoId) {
      revalidatePath("/pagamento-mo/contratos");
    }
    return { message: "Lançamento registrado." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function createContrato(
  _state: MoActionState,
  formData: FormData,
): Promise<MoActionState> {
  try {
    const profile = await requireActor("pagamento_mo.create");
    const obraId = text(formData, "obra_id");
    const colaboradorId = text(formData, "colaborador_id");
    const descricao = text(formData, "descricao");
    const valorTotal = money(formData.get("valor_total"));

    if (!obraId || !colaboradorId) {
      return { message: "Preencha obra e prestador." };
    }

    if (!descricao) {
      return { message: "Descreva o serviço contratado." };
    }

    if (valorTotal == null || valorTotal <= 0) {
      return { message: "Informe o valor total do contrato." };
    }

    // Gestor de obra só fecha contrato na obra vinculada a ele — a RLS
    // reforça isso, mas validar aqui dá uma mensagem clara em vez de um erro
    // genérico do banco.
    if (isGestorRole(profile.role)) {
      const linkedObras = await getLinkedObrasForUser(profile.id);
      if (!linkedObras.includes(obraId)) {
        return {
          message: "Você não tem permissão para fechar contrato nesta obra.",
        };
      }
    }

    const supabase = (await createClient()) as any;
    const { data: contrato, error } = await supabase
      .from("contratos_mo")
      .insert({
        cliente_id: profile.cliente_id,
        obra_id: obraId,
        colaborador_id: colaboradorId,
        descricao,
        valor_total: valorTotal,
        criado_por: profile.id,
      })
      .select("id")
      .single();

    if (error || !contrato) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível cadastrar o contrato.",
        ),
      };
    }

    const context = await getRequestContext();
    await registrarHistorico({
      clienteId: profile.cliente_id,
      actorId: profile.id,
      entidade: "contrato_mo",
      entidadeId: contrato.id,
      acao: "contrato_criado",
      statusNovo: "aberto",
      ip: context.ip,
      userAgent: context.userAgent,
      dados: {
        obra_id: obraId,
        colaborador_id: colaboradorId,
        valor_total: valorTotal,
      },
    });

    revalidatePath("/pagamento-mo/contratos");
    return { id: contrato.id, message: "Contrato cadastrado." };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function confirmarLancamento(formData: FormData) {
  const profile = await requireActor("pagamento_mo.confirm");
  const id = text(formData, "id");
  const valorDiariaInput = money(formData.get("valor_diaria"));
  const orcamentoItemIdInput = text(formData, "orcamento_item_id");

  if (!id) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;

  const { data: lancamento } = await supabase
    .from("lancamentos_mo")
    .select("valor,qtd_diarias,tipo,orcamento_item_id")
    .eq("id", id)
    .single();

  if (!lancamento) {
    throw new Error("Lançamento não encontrado.");
  }

  const updates: Record<string, unknown> = {
    status: "confirmado",
    confirmado_por: profile.id,
    confirmado_at: new Date().toISOString(),
  };

  // Solicitação lançada por diárias sem valor da diária (gestor_obra não
  // arbitra esse valor) — compras/adm_geral finaliza informando-o agora.
  if (lancamento.valor == null) {
    if (
      lancamento.qtd_diarias == null ||
      valorDiariaInput == null ||
      valorDiariaInput <= 0
    ) {
      throw new Error("Informe o valor da diária para confirmar o pagamento.");
    }

    updates.valor_diaria = valorDiariaInput;
    updates.valor = Number(
      (lancamento.qtd_diarias * valorDiariaInput).toFixed(2),
    );
  }

  // Idem pro centro de custo: gestor_obra não define, compras/adm_geral
  // preenche aqui se ainda não tiver sido definido.
  if (lancamento.tipo === "solicitacao" && !lancamento.orcamento_item_id) {
    if (!orcamentoItemIdInput) {
      throw new Error(
        "Selecione o centro de custo para confirmar o pagamento.",
      );
    }

    updates.orcamento_item_id = orcamentoItemIdInput;
  }

  const { error } = await supabase
    .from("lancamentos_mo")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível confirmar o pagamento.");
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "lancamento_mo",
    entidadeId: id,
    acao: "pagamento_confirmado",
    statusNovo: "confirmado",
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/pagamento-mo");
}

// Vale (adiantamento) fica em aberto até compras/adm vincular a um
// pagamento (solicitação/reembolso) do mesmo colaborador e dar baixa —
// registra o desconto sem mexer no valor do pagamento em si (isso é
// combinado por fora, na hora de pagar).
export async function darBaixaVale(formData: FormData) {
  const profile = await requireActor("pagamento_mo.confirm");
  const id = text(formData, "id");
  const pagamentoId = text(formData, "pagamento_id");

  if (!id || !pagamentoId) {
    throw new Error("Selecione o pagamento pra vincular a baixa.");
  }

  const supabase = (await createClient()) as any;

  const [{ data: vale }, { data: pagamento }] = await Promise.all([
    supabase
      .from("lancamentos_mo")
      .select("id,tipo,status,colaborador_id,vale_aplicado_em")
      .eq("id", id)
      .single(),
    supabase
      .from("lancamentos_mo")
      .select("id,tipo,colaborador_id")
      .eq("id", pagamentoId)
      .single(),
  ]);

  if (!vale || vale.tipo !== "vale") {
    throw new Error("Lançamento não é um vale.");
  }

  if (vale.status !== "confirmado") {
    throw new Error("Só é possível dar baixa num vale já confirmado.");
  }

  if (vale.vale_aplicado_em) {
    throw new Error("Este vale já teve baixa dada.");
  }

  if (!pagamento || !["solicitacao", "reembolso"].includes(pagamento.tipo)) {
    throw new Error(
      "Selecione um pagamento (solicitação ou reembolso) válido.",
    );
  }

  if (pagamento.colaborador_id !== vale.colaborador_id) {
    throw new Error("O pagamento precisa ser do mesmo colaborador do vale.");
  }

  const { error } = await supabase
    .from("lancamentos_mo")
    .update({ vale_aplicado_em: pagamentoId })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível dar baixa no vale.");
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: profile.cliente_id,
    actorId: profile.id,
    entidade: "lancamento_mo",
    entidadeId: id,
    acao: "vale_baixado",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: { pagamento_id: pagamentoId },
  });

  revalidatePath("/pagamento-mo");
}

export async function createColaboradorGestor(
  _state: MoActionState,
  formData: FormData,
): Promise<MoActionState> {
  try {
    const profile = await requireActor("pagamento_mo.create");
    const nome = text(formData, "nome");
    const chavePix = text(formData, "chave_pix");
    const dadosBancarios = text(formData, "dados_bancarios");

    if (!nome) {
      return { message: "Informe o nome do prestador." };
    }

    if (!chavePix && !dadosBancarios) {
      return { message: "Informe a chave Pix ou os dados bancários." };
    }

    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from("colaboradores")
      .insert({
        cliente_id: profile.cliente_id,
        nome,
        chave_pix: chavePix,
        dados_bancarios: dadosBancarios,
      })
      .select("id,nome")
      .single();

    if (error || !data) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível cadastrar o prestador.",
        ),
      };
    }

    return { id: data.id, nome: data.nome };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function createColaborador(formData: FormData) {
  const profile = await requireActor("pagamento_mo.confirm");
  const nome = text(formData, "nome");

  if (!nome) {
    throw new Error("Informe o nome do colaborador.");
  }

  const supabase = (await createClient()) as any;
  await supabase.from("colaboradores").insert({
    cliente_id: profile.cliente_id,
    nome,
    funcao: text(formData, "funcao"),
    telefone: text(formData, "telefone"),
  });

  revalidatePath("/pagamento-mo/colaboradores");
}
