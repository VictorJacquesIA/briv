// Regressão dos triggers check_contrato_mo_saldo e sync_contrato_mo_status
// (supabase/migrations/202607180001_contratos_mo.sql): uma parcela não pode
// exceder o saldo restante do contrato, e nenhuma parcela pode ser lançada
// num contrato já quitado. Os triggers rodam independente de RLS — usamos
// o cliente admin (service role) só pra exercitar a lógica do trigger.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  cleanupTestTenant,
  createTestCliente,
} from "../helpers/test-tenant";

describe("saldo de contratos de mão de obra (trigger)", () => {
  let clienteId: string;
  let obraId: string;
  let colaboradorId: string;
  let orcamentoItemId: string;
  let contratoId: string;

  beforeAll(async () => {
    clienteId = await createTestCliente();

    const [{ data: obra }, { data: colaborador }] = await Promise.all([
      admin
        .from("obras")
        .insert({ cliente_id: clienteId, nome: "Obra contrato" })
        .select("id")
        .single(),
      admin
        .from("colaboradores")
        .insert({ cliente_id: clienteId, nome: "Prestador de teste" })
        .select("id")
        .single(),
    ]);
    obraId = obra!.id;
    colaboradorId = colaborador!.id;

    // check constraint lancamentos_mo_solicitacao_requer_orcamento exige
    // orcamento_item_id em todo lançamento tipo=solicitacao já confirmado.
    const { data: orcamentoItem } = await admin
      .from("obra_orcamento_itens")
      .insert({
        cliente_id: clienteId,
        obra_id: obraId,
        descricao: "Centro de custo de teste",
        tipo: "mao_de_obra",
        valor_orcado: 1000,
      })
      .select("id")
      .single();
    orcamentoItemId = orcamentoItem!.id;

    const { data: contrato } = await admin
      .from("contratos_mo")
      .insert({
        cliente_id: clienteId,
        obra_id: obraId,
        colaborador_id: colaboradorId,
        descricao: "Contrato de teste",
        valor_total: 1000,
      })
      .select("id,status")
      .single();
    contratoId = contrato!.id;
    expect(contrato!.status).toBe("aberto");
  }, 30000);

  afterAll(async () => {
    await cleanupTestTenant({ clienteId });
  });

  function lancamento(valor: number) {
    return admin.from("lancamentos_mo").insert({
      cliente_id: clienteId,
      colaborador_id: colaboradorId,
      obra_id: obraId,
      orcamento_item_id: orcamentoItemId,
      contrato_id: contratoId,
      tipo: "solicitacao",
      status: "confirmado",
      valor,
    });
  }

  it("aceita uma parcela dentro do saldo e mantém o contrato aberto", async () => {
    const { error } = await lancamento(600);
    expect(error).toBeNull();

    const { data: contrato } = await admin
      .from("contratos_mo")
      .select("status")
      .eq("id", contratoId)
      .single();
    expect(contrato?.status).toBe("aberto");
  });

  it("NÃO permite uma parcela que exceda o saldo restante", async () => {
    const { error } = await lancamento(500);
    expect(error).not.toBeNull();
  });

  it("aceita a parcela final e quita o contrato", async () => {
    const { error } = await lancamento(400);
    expect(error).toBeNull();

    const { data: contrato } = await admin
      .from("contratos_mo")
      .select("status")
      .eq("id", contratoId)
      .single();
    expect(contrato?.status).toBe("quitado");
  });

  it("NÃO permite lançar em um contrato já quitado", async () => {
    const { error } = await lancamento(1);
    expect(error).not.toBeNull();
  });
});
