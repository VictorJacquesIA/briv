// Helper compartilhado por features/compras/actions/item-actions.ts e
// features/estoque/actions.ts. Fica fora de qualquer arquivo "use server"
// de propósito: se estivesse num arquivo desses, viraria uma Server Action
// invocável diretamente aceitando nome de tabela e campos arbitrários.
export async function findOrCreateByName(
  supabase: any,
  table: "unidades" | "items",
  nome: string,
  extraFields: Record<string, unknown> = {},
): Promise<{ id: string; nome: string } | null> {
  const { data: existing } = await supabase
    .from(table)
    .select("id,nome")
    .ilike("nome", nome)
    .limit(1);

  if (existing && existing.length > 0) {
    return { id: existing[0].id, nome: existing[0].nome };
  }

  const { data: created, error } = await supabase
    .from(table)
    .insert({ nome, ...extraFields })
    .select("id,nome")
    .limit(1);

  if (error || !created?.[0]) {
    return null;
  }

  return { id: created[0].id, nome: created[0].nome };
}
