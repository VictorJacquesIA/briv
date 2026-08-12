"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";
import { searchItems } from "@/services/compras-service";
import { findOrCreateByName } from "@/services/catalogo-service";

export type ItemActionState = {
  message?: string;
  id?: string;
  nome?: string;
};

export async function createUnit(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const profile = await getCurrentProfile();

  if (!profile?.id) {
    return { message: "Sessão expirada. Faça login novamente." };
  }

  const nome = String(formData.get("unidade_nome") ?? "").trim();

  if (!nome) {
    return { message: "Nome da unidade é obrigatório." };
  }

  const supabase = await createClient();
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
  const profile = await getCurrentProfile();

  if (!profile?.id) {
    return { message: "Sessão expirada. Faça login novamente." };
  }

  const nome = String(formData.get("item_nome") ?? "").trim();
  const unidadeId = String(formData.get("unidade_id") ?? "").trim() || null;

  if (!nome) {
    return { message: "Nome do item é obrigatório." };
  }

  const supabase = await createClient();
  const result = await findOrCreateByName(supabase, "items", nome, {
    unidade_id: unidadeId,
  });

  if (!result) {
    return { message: "Erro ao criar item." };
  }

  return result;
}

export async function searchItemsAction(query: string) {
  const profile = await getCurrentProfile();

  if (!profile?.id) {
    return [];
  }

  return searchItems(query);
}
