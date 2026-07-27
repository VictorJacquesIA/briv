// Regressão dos bugs de isolamento de gestor_obra em `solicitacoes`,
// documentados em supabase/migrations/202607120001_gestor_obra_solicitacoes_isolation.sql
// (IDOR: gestor via/editava solicitação de obra alheia) e
// 202607120006_estoque_role_rls_fixes.sql (tautologia no EXISTS do INSERT:
// `ou.obra_id = obra_id` resolvia pra `ou.obra_id = ou.obra_id`, sempre
// verdadeiro, permitindo criar solicitação pra qualquer obra).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  cleanupTestTenant,
  createTestCliente,
  createTestUser,
  signInTestUser,
} from "../helpers/test-tenant";

describe("isolamento de solicitações por gestor_obra", () => {
  let clienteId: string;
  let obraA: string;
  let obraB: string;
  let gestorA: Awaited<ReturnType<typeof createTestUser>>;
  let gestorB: Awaited<ReturnType<typeof createTestUser>>;
  let solicitacaoDaObraA: string;

  beforeAll(async () => {
    clienteId = await createTestCliente();

    const [{ data: obraARow }, { data: obraBRow }] = await Promise.all([
      admin
        .from("obras")
        .insert({ cliente_id: clienteId, nome: "Obra A" })
        .select("id")
        .single(),
      admin
        .from("obras")
        .insert({ cliente_id: clienteId, nome: "Obra B" })
        .select("id")
        .single(),
    ]);
    obraA = obraARow!.id;
    obraB = obraBRow!.id;

    gestorA = await createTestUser({
      clienteId,
      role: "gestor_obra",
      nome: "Gestor A",
    });
    gestorB = await createTestUser({
      clienteId,
      role: "gestor_obra",
      nome: "Gestor B",
    });

    await Promise.all([
      admin
        .from("obra_usuarios")
        .insert({ obra_id: obraA, user_id: gestorA.id, ativo: true }),
      admin
        .from("obra_usuarios")
        .insert({ obra_id: obraB, user_id: gestorB.id, ativo: true }),
    ]);

    const { data: solicitacao } = await admin
      .from("solicitacoes")
      .insert({
        cliente_id: clienteId,
        obra_id: obraA,
        solicitante_id: gestorA.id,
        responsavel_obra_id: gestorA.id,
      })
      .select("id")
      .single();
    solicitacaoDaObraA = solicitacao!.id;
  }, 30000);

  afterAll(async () => {
    await cleanupTestTenant({
      clienteId,
      userIds: [gestorA.id, gestorB.id],
    });
  });

  it("gestor dono da obra enxerga a própria solicitação", async () => {
    const clientA = await signInTestUser(gestorA.email, gestorA.password);
    const { data } = await clientA
      .from("solicitacoes")
      .select("id")
      .eq("id", solicitacaoDaObraA);

    expect(data).toHaveLength(1);
  });

  it("gestor de outra obra NÃO enxerga a solicitação (regressão IDOR)", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { data } = await clientB
      .from("solicitacoes")
      .select("id")
      .eq("id", solicitacaoDaObraA);

    expect(data).toHaveLength(0);
  });

  it("gestor de outra obra NÃO consegue criar solicitação pra obra alheia (regressão da tautologia no INSERT)", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { error } = await clientB.from("solicitacoes").insert({
      cliente_id: clienteId,
      obra_id: obraA,
      solicitante_id: gestorB.id,
      responsavel_obra_id: gestorB.id,
    });

    expect(error).not.toBeNull();
  });

  it("gestor consegue criar solicitação pra obra vinculada a ele", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { error } = await clientB.from("solicitacoes").insert({
      cliente_id: clienteId,
      obra_id: obraB,
      solicitante_id: gestorB.id,
      responsavel_obra_id: gestorB.id,
    });

    expect(error).toBeNull();
  });
});
