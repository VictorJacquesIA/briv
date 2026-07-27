// Regressão do bug documentado em
// supabase/migrations/202607090001_role_consolidation.sql: user_permissions
// e obra_usuarios não tinham RLS nenhuma, permitindo qualquer usuário
// autenticado ler/escrever permissões e vínculos de QUALQUER outro usuário
// (inclusive de outro tenant).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  cleanupTestTenant,
  createTestCliente,
  createTestUser,
  signInTestUser,
} from "../helpers/test-tenant";

describe("RLS de user_permissions e obra_usuarios", () => {
  let clienteId: string;
  let obraId: string;
  let gestorA: Awaited<ReturnType<typeof createTestUser>>;
  let gestorB: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    clienteId = await createTestCliente();

    const { data: obra } = await admin
      .from("obras")
      .insert({ cliente_id: clienteId, nome: "Obra vinculada" })
      .select("id")
      .single();
    obraId = obra!.id;

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
      admin.from("user_permissions").insert({
        user_id: gestorA.id,
        permission_key: "materiais.view",
        allowed: true,
      }),
      admin
        .from("obra_usuarios")
        .insert({ obra_id: obraId, user_id: gestorA.id, ativo: true }),
    ]);
  }, 30000);

  afterAll(async () => {
    await cleanupTestTenant({
      clienteId,
      userIds: [gestorA.id, gestorB.id],
    });
  });

  it("usuário lê as próprias permissões", async () => {
    const clientA = await signInTestUser(gestorA.email, gestorA.password);
    const { data } = await clientA
      .from("user_permissions")
      .select("permission_key")
      .eq("user_id", gestorA.id);

    expect(data).toHaveLength(1);
  });

  it("usuário NÃO lê permissões de outro usuário (regressão da RLS ausente)", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { data } = await clientB
      .from("user_permissions")
      .select("permission_key")
      .eq("user_id", gestorA.id);

    expect(data).toHaveLength(0);
  });

  it("usuário NÃO lê vínculos obra_usuarios de outro usuário", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { data } = await clientB
      .from("obra_usuarios")
      .select("id")
      .eq("user_id", gestorA.id);

    expect(data).toHaveLength(0);
  });

  it("gestor_obra NÃO consegue se auto-conceder uma permissão", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { error } = await clientB.from("user_permissions").insert({
      user_id: gestorB.id,
      permission_key: "usuarios.manage",
      allowed: true,
    });

    expect(error).not.toBeNull();
  });

  it("gestor_obra NÃO consegue se auto-vincular a uma obra", async () => {
    const clientB = await signInTestUser(gestorB.email, gestorB.password);
    const { error } = await clientB.from("obra_usuarios").insert({
      obra_id: obraId,
      user_id: gestorB.id,
      ativo: true,
    });

    expect(error).not.toBeNull();
  });
});
