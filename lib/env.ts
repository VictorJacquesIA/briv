const requiredPublicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function getPublicEnv() {
  const missing = Object.entries(requiredPublicEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Variaveis de ambiente ausentes: ${missing.join(", ")}`);
  }

  return requiredPublicEnv as {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}
