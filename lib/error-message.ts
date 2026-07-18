const KNOWN_PATTERNS: Array<[RegExp, string]> = [
  [
    /row-level security policy/i,
    "Você não tem permissão para realizar esta ação.",
  ],
  [/permission denied/i, "Você não tem permissão para realizar esta ação."],
  [
    /duplicate key value violates unique constraint/i,
    "Já existe um registro com esses dados.",
  ],
  [
    /violates foreign key constraint/i,
    "Um dos itens selecionados não existe mais ou foi removido.",
  ],
  [
    /violates check constraint/i,
    "Os dados informados não atendem às regras do sistema.",
  ],
  [
    /JWT expired|invalid claim|refresh_token_not_found|session.*missing/i,
    "Sua sessão expirou. Faça login novamente.",
  ],
  [
    /fetch failed|ECONNREFUSED|ENOTFOUND|NetworkError|Failed to fetch/i,
    "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
  ],
  [
    /rate limit/i,
    "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
  ],
];

function rawMessageOf(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return null;
}

/**
 * Traduz erros técnicos (Postgres/Supabase, rede, sessão) para uma mensagem
 * que explica o que aconteceu, em vez de repassar o texto cru do driver
 * (ex.: "duplicate key value violates unique constraint ...") ou um
 * "Erro inesperado" sem nenhum detalhe.
 */
export function friendlyErrorMessage(
  error: unknown,
  fallback = "Ocorreu um erro inesperado. Tente novamente ou contate o suporte.",
): string {
  const raw = rawMessageOf(error);

  if (!raw) {
    return fallback;
  }

  for (const [pattern, friendly] of KNOWN_PATTERNS) {
    if (pattern.test(raw)) {
      return friendly;
    }
  }

  return raw;
}
