import { createClient } from "@/lib/supabase/server";

/**
 * Rate limit best-effort baseado em `public.check_rate_limit` (Postgres).
 * Em caso de falha na checagem (rede, RPC fora do ar), libera a requisição —
 * rate limit é defesa em profundidade, não pode virar um novo ponto único de
 * falha que derruba rotas críticas (login, aprovação de compra).
 */
export async function checkRateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("check_rate_limit falhou:", error.message);
    return true;
  }

  return data === true;
}
