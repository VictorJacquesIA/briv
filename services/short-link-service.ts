import { randomBytes } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function insertShortLink(
  supabase: any,
  input: { targetUrl: string; clienteId: string; createdBy?: string | null },
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(5).toString("base64url");
    const { error } = await supabase.from("short_links").insert({
      code,
      target_url: input.targetUrl,
      cliente_id: input.clienteId,
      created_by: input.createdBy ?? null,
    });

    if (!error) {
      return `${appUrl}/l/${code}`;
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Não foi possível gerar um link curto.");
}

/**
 * Cria um link curto (`/l/{code}`) que redireciona pra `targetUrl` — usado
 * pra substituir as signed URLs do Supabase Storage (200+ caracteres)
 * quando mandadas por WhatsApp pro fornecedor. Retorna a URL curta
 * completa, já pronta pra usar na mensagem. Usa a sessão do usuário logado
 * — em fluxos públicos sem sessão (ex.: registrarDecisaoPublica), use
 * `createShortLinkWithClient` passando o client admin já em mãos.
 */
export async function createShortLink(input: {
  targetUrl: string;
  clienteId: string;
  createdBy?: string | null;
}): Promise<string> {
  const supabase = await createClient();
  return insertShortLink(supabase, input);
}

export async function createShortLinkWithClient(
  supabase: any,
  input: { targetUrl: string; clienteId: string; createdBy?: string | null },
): Promise<string> {
  return insertShortLink(supabase, input);
}

// Resolvido publicamente (sem sessão) pelo redirect em app/l/[code]/route.ts
// — mesmo padrão do getPublicApprovalByToken, via service role.
export async function resolveShortLink(code: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("short_links")
    .select("target_url")
    .eq("code", code)
    .maybeSingle();

  return data?.target_url ?? null;
}
