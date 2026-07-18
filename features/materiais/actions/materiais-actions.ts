"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";

export async function createUnidade(formData: FormData) {
  await requireActor("materiais.create");
  const nome = text(formData, "nome");

  if (!nome) {
    throw new Error("Informe o nome da unidade.");
  }

  const supabase = (await createClient()) as any;
  await supabase
    .from("unidades")
    .insert({ nome, codigo: text(formData, "codigo") });

  revalidatePath("/materiais/unidades");
}

export async function toggleUnidadeAtivo(formData: FormData) {
  await requireActor("materiais.edit");
  const id = text(formData, "id");
  const ativo = formData.get("ativo") === "true";

  if (!id) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;
  await supabase.from("unidades").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/materiais/unidades");
}

export async function createItemCatalogo(formData: FormData) {
  await requireActor("materiais.create");
  const nome = text(formData, "nome");
  const unidadeNome = text(formData, "unidade_nome");

  if (!nome) {
    throw new Error("Informe o nome do item.");
  }

  if (!unidadeNome) {
    throw new Error("Informe a unidade de medida do item.");
  }

  const supabase = (await createClient()) as any;

  // Cadastro unificado: a unidade é resolvida (ou criada) junto do item,
  // sem precisar passar antes por /materiais/unidades.
  const { data: existente } = await supabase
    .from("unidades")
    .select("id")
    .ilike("nome", unidadeNome)
    .maybeSingle();

  const unidadeId =
    existente?.id ??
    (
      await supabase
        .from("unidades")
        .insert({ nome: unidadeNome })
        .select("id")
        .single()
    ).data?.id;

  if (!unidadeId) {
    throw new Error("Não foi possível registrar a unidade de medida.");
  }

  await supabase.from("items").insert({
    nome,
    descricao: text(formData, "descricao"),
    unidade_id: unidadeId,
  });

  revalidatePath("/materiais");
  revalidatePath("/materiais/unidades");
}

export async function toggleItemAtivo(formData: FormData) {
  await requireActor("materiais.edit");
  const id = text(formData, "id");
  const ativo = formData.get("ativo") === "true";

  if (!id) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;
  await supabase.from("items").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/materiais");
}
