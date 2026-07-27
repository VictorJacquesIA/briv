"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";

export async function createFornecedor(formData: FormData) {
  const profile = await requireActor("fornecedores.create");
  const razaoSocial = text(formData, "razao_social");

  if (!razaoSocial) {
    throw new Error("Informe a razão social do fornecedor.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("fornecedores").insert({
    cliente_id: profile.cliente_id,
    razao_social: razaoSocial,
    nome_fantasia: text(formData, "nome_fantasia"),
    cnpj: text(formData, "cnpj"),
    email: text(formData, "email"),
    telefone: text(formData, "telefone"),
    whatsapp: text(formData, "whatsapp"),
    contato: text(formData, "contato"),
    endereco: text(formData, "endereco"),
    mensagem_template: text(formData, "mensagem_template"),
  });

  if (error) {
    throw new Error("Não foi possível cadastrar o fornecedor.");
  }

  revalidatePath("/fornecedores");
}

export async function toggleFornecedorAtivo(formData: FormData) {
  await requireActor("fornecedores.edit");
  const id = text(formData, "id");
  const ativo = formData.get("ativo") === "true";

  if (!id) {
    throw new Error("Dados inválidos.");
  }

  const supabase = await createClient();
  await supabase.from("fornecedores").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/fornecedores");
}
