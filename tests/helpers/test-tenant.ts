import { randomUUID } from "node:crypto";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Testes de integração precisam de ${name} no .env.local.`);
  }

  return value;
}

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

// Cliente com service role — ignora RLS, usado só pra montar/desmontar os
// dados de teste (fixtures). As asserções de RLS em si usam sempre um
// cliente autenticado como o usuário de teste (ver signInTestUser).
export const admin = createSupabaseClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

type UserRole = Database["public"]["Enums"]["user_role"];

// Tudo isolado sob um cliente (tenant) dedicado, criado por teste e
// descartado no final — nunca reaproveita o tenant real do projeto.
export async function createTestCliente() {
  const { data, error } = await admin
    .from("clientes")
    .insert({ razao_social: `VITEST ${randomUUID()}` })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao criar cliente de teste: ${error?.message}`);
  }

  return data.id;
}

// Apaga tudo que ficou sob o cliente de teste, na ordem certa:
// 1) solicitacoes primeiro — solicitante_id/responsavel_obra_id referenciam
//    profiles com ON DELETE RESTRICT, então uma solicitação criada durante
//    o teste bloquearia a remoção do profile do usuário se não for apagada
//    antes (foi exatamente isso que deixou clientes de teste órfãos numa
//    primeira versão deste helper, que ignorava o erro do delete).
// 2) profiles — cliente_id também é ON DELETE RESTRICT em relação a
//    clientes, então precisa sumir antes do passo 3.
// 3) clientes — cascateia o resto (obras, colaboradores, ferramentas,
//    contratos_mo, lancamentos_mo, historico etc., todos com cliente_id
//    ON DELETE CASCADE).
// 4) usuários de auth — feito por último; a esta altura já não há profile
//    pra cascatear, é só a remoção do usuário em si.
export async function cleanupTestTenant(input: {
  clienteId: string;
  userIds?: string[];
}) {
  const { error: solicitacoesError } = await admin
    .from("solicitacoes")
    .delete()
    .eq("cliente_id", input.clienteId);

  if (solicitacoesError) {
    throw new Error(
      `Falha ao limpar solicitações de teste: ${solicitacoesError.message}`,
    );
  }

  const { error: profilesError } = await admin
    .from("profiles")
    .delete()
    .eq("cliente_id", input.clienteId);

  if (profilesError) {
    throw new Error(
      `Falha ao limpar perfis de teste: ${profilesError.message}`,
    );
  }

  const { error: clienteError } = await admin
    .from("clientes")
    .delete()
    .eq("id", input.clienteId);

  if (clienteError) {
    throw new Error(
      `Falha ao limpar cliente de teste: ${clienteError.message}`,
    );
  }

  for (const userId of input.userIds ?? []) {
    const { error: userError } = await admin.auth.admin.deleteUser(userId);

    if (userError) {
      throw new Error(
        `Falha ao limpar usuário de teste ${userId}: ${userError.message}`,
      );
    }
  }
}

export async function createTestUser(input: {
  clienteId: string;
  role: UserRole;
  nome: string;
}) {
  const email = `vitest-${randomUUID()}@example.com`;
  const password = randomUUID();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    throw new Error(`Falha ao criar usuário de teste: ${authError?.message}`);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    cliente_id: input.clienteId,
    role: input.role,
    nome: input.nome,
    ativo: true,
  });

  if (profileError) {
    throw new Error(`Falha ao criar perfil de teste: ${profileError.message}`);
  }

  return { id: authData.user.id, email, password };
}

// Cliente autenticado como o usuário de teste — é esse client (não o
// admin) que precisa ser usado pra exercitar RLS de verdade, já que RLS
// depende de auth.uid() vindo de uma sessão real.
export async function signInTestUser(email: string, password: string) {
  const client = createSupabaseClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Falha ao autenticar usuário de teste: ${error.message}`);
  }

  return client;
}
