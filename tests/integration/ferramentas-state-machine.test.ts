// Regressão do trigger check_and_sync_ferramenta_movimentacao
// (supabase/migrations/202607180004_ferramentas.sql, corrigido em
// 202607180005_fix_ferramenta_trigger_cast.sql pro cast do enum
// ferramenta_status). O trigger roda independente de RLS — usamos o
// cliente admin (service role) só pra exercitar a lógica do trigger em si.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  cleanupTestTenant,
  createTestCliente,
} from "../helpers/test-tenant";

describe("máquina de estados de ferramentas (trigger)", () => {
  let clienteId: string;
  let obraId: string;
  let ferramentaId: string;

  beforeAll(async () => {
    clienteId = await createTestCliente();

    const { data: obra } = await admin
      .from("obras")
      .insert({ cliente_id: clienteId, nome: "Obra ferramenta" })
      .select("id")
      .single();
    obraId = obra!.id;

    const { data: ferramenta } = await admin
      .from("ferramentas")
      .insert({ cliente_id: clienteId, nome: "Furadeira de teste" })
      .select("id,status")
      .single();
    ferramentaId = ferramenta!.id;
    expect(ferramenta!.status).toBe("deposito");
  }, 30000);

  afterAll(async () => {
    await cleanupTestTenant({ clienteId });
  });

  it("empresta a ferramenta (saida) e sincroniza status/obra_atual_id", async () => {
    const { error } = await admin.from("movimentacoes_ferramentas").insert({
      cliente_id: clienteId,
      ferramenta_id: ferramentaId,
      tipo: "saida",
      obra_id: obraId,
    });
    expect(error).toBeNull();

    const { data: ferramenta } = await admin
      .from("ferramentas")
      .select("status,obra_atual_id")
      .eq("id", ferramentaId)
      .single();

    expect(ferramenta?.status).toBe("emprestada");
    expect(ferramenta?.obra_atual_id).toBe(obraId);
  });

  it("NÃO permite emprestar de novo uma ferramenta já emprestada", async () => {
    const { error } = await admin.from("movimentacoes_ferramentas").insert({
      cliente_id: clienteId,
      ferramenta_id: ferramentaId,
      tipo: "saida",
      obra_id: obraId,
    });

    expect(error).not.toBeNull();
  });

  it("devolve a ferramenta (entrada) e sincroniza status/obra_atual_id", async () => {
    const { error } = await admin.from("movimentacoes_ferramentas").insert({
      cliente_id: clienteId,
      ferramenta_id: ferramentaId,
      tipo: "entrada",
      obra_id: obraId,
    });
    expect(error).toBeNull();

    const { data: ferramenta } = await admin
      .from("ferramentas")
      .select("status,obra_atual_id")
      .eq("id", ferramentaId)
      .single();

    expect(ferramenta?.status).toBe("deposito");
    expect(ferramenta?.obra_atual_id).toBeNull();
  });

  it("NÃO permite devolver de novo uma ferramenta já em depósito", async () => {
    const { error } = await admin.from("movimentacoes_ferramentas").insert({
      cliente_id: clienteId,
      ferramenta_id: ferramentaId,
      tipo: "entrada",
      obra_id: obraId,
    });

    expect(error).not.toBeNull();
  });
});
