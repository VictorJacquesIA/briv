// RESET DE USUÁRIOS DE AUTENTICAÇÃO — script manual, não roda sozinho.
//
// Apaga TODOS os usuários do Supabase Auth (auth.users), via API de
// administração (não mexe direto na tabela auth.users por SQL — evita
// deixar sessão/refresh token órfãos). Rode isso DEPOIS de
// `reset-dados-teste.sql` (que já limpou os profiles/dados de negócio).
//
// Como rodar (na raiz do projeto, com as env vars do .env.local carregadas):
//   node --env-file=.env.local ./node_modules/.bin/tsx supabase/scripts/reset-auth-users.mjs
// ou, se `tsx` não estiver instalado como devDependency:
//   export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)
//   npx tsx supabase/scripts/reset-auth-users.mjs
//
// Depois de rodar, siga supabase/seed/initial_client.sql +
// bootstrap-admin.sql.example pra criar a empresa real e o primeiro admin.

import { createAdminClient } from "../../lib/supabase/admin.ts";

const admin = createAdminClient();

let page = 1;
let totalDeleted = 0;

while (true) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 100,
  });

  if (error) {
    throw error;
  }

  if (data.users.length === 0) {
    break;
  }

  for (const user of data.users) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`Falha ao apagar ${user.email ?? user.id}:`, deleteError.message);
      continue;
    }
    totalDeleted += 1;
    console.log(`Apagado: ${user.email ?? user.id}`);
  }

  page += 1;
}

console.log(`\nTotal de usuários apagados: ${totalDeleted}`);
