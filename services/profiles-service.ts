import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { normalizeRole } from "@/lib/permissions";
import type { Database } from "@/types/database";

// Memoizado por requisição: o layout e quase toda página do dashboard
// chamam isso de forma independente — sem cache() seria uma chamada a
// auth.getUser() + select em profiles duplicada em cada render.
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = (await supabase
    .from("profiles")
    .select("id,nome,role,cliente_id,ativo,telefone,foto_url")
    .eq("id", user.id)
    .single()) as any;

  if (!data) {
    return null;
  }

  return {
    id: data.id ?? null,
    nome: data.nome ?? null,
    role: normalizeRole(data.role),
    cliente_id: data.cliente_id ?? null,
    ativo: data.ativo ?? false,
    telefone: data.telefone ?? null,
    foto_url: data.foto_url ?? null,
    email: user.email ?? null,
  };
});
