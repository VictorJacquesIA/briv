"use server";

import { createClient } from "@/lib/supabase/server";
import { searchItems } from "@/services/compras-service";

export type ItemActionState = {
  message?: string;
  id?: string;
  nome?: string;
};

async function findOrCreateByName(
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

export async function createUnit(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const nome = String(formData.get("unidade_nome") ?? "").trim();

  if (!nome) {
    return { message: "Nome da unidade é obrigatório." };
  }

  const supabase = (await createClient()) as any;
  const result = await findOrCreateByName(supabase, "unidades", nome);

  if (!result) {
    return { message: "Erro ao criar unidade." };
  }

  return result;
}

export async function createItem(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const nome = String(formData.get("item_nome") ?? "").trim();
  const unidadeId = String(formData.get("unidade_id") ?? "").trim() || null;

  if (!nome) {
    return { message: "Nome do item é obrigatório." };
  }

  const supabase = (await createClient()) as any;
  const result = await findOrCreateByName(supabase, "items", nome, {
    unidade_id: unidadeId,
  });

  if (!result) {
    return { message: "Erro ao criar item." };
  }

  return result;
}

export async function searchItemsAction(query: string) {
  return searchItems(query);
}
