"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { text } from "@/lib/form-data";
import { requireActor } from "@/lib/require-actor";

export type ItemFormState = { message?: string; success?: boolean };

// PostgREST manda filtros como `.in()` na própria query string da URL —
// com centenas/milhares de ids selecionados numa ação em massa, uma única
// requisição pode estourar o limite de tamanho de URL do proxy/CDN na
// frente do Supabase, falhando sem erro claro. Processar em lotes evita
// isso independente de quantos itens forem selecionados.
const BULK_BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Resolve a unidade pelo nome (case-insensitive) ou cria uma nova — usado
// pelo cadastro e pela edição (individual e em massa) do catálogo, que
// aceitam o nome da unidade em texto livre em vez de exigir um id existente.
async function resolveOrCreateUnidadeId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nome: string,
): Promise<string | null> {
  const { data: existente } = await supabase
    .from("unidades")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();

  if (existente?.id) {
    return existente.id;
  }

  const { data: criada } = await supabase
    .from("unidades")
    .insert({ nome })
    .select("id")
    .single();

  return criada?.id ?? null;
}

export async function createUnidade(formData: FormData) {
  await requireActor("materiais.create");
  const nome = text(formData, "nome");

  if (!nome) {
    throw new Error("Informe o nome da unidade.");
  }

  const supabase = await createClient();
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

  const supabase = await createClient();
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

  const supabase = await createClient();

  // Cadastro unificado: a unidade é resolvida (ou criada) junto do item,
  // sem precisar passar antes por /materiais/unidades.
  const unidadeId = await resolveOrCreateUnidadeId(supabase, unidadeNome);

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

  const supabase = await createClient();
  await supabase.from("items").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/materiais");
}

export async function updateItemCatalogo(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  try {
    await requireActor("materiais.edit");
    const id = text(formData, "id");
    const nome = text(formData, "nome");
    const unidadeNome = text(formData, "unidade_nome");

    if (!id) {
      return { message: "Item inválido." };
    }

    if (!nome) {
      return { message: "Informe o nome do item." };
    }

    if (!unidadeNome) {
      return { message: "Informe a unidade de medida do item." };
    }

    const supabase = await createClient();
    const unidadeId = await resolveOrCreateUnidadeId(supabase, unidadeNome);

    if (!unidadeId) {
      return { message: "Não foi possível registrar a unidade de medida." };
    }

    const { error } = await supabase
      .from("items")
      .update({
        nome,
        descricao: text(formData, "descricao"),
        unidade_id: unidadeId,
      })
      .eq("id", id);

    if (error) {
      return {
        message: friendlyErrorMessage(
          error,
          "Não foi possível salvar as alterações.",
        ),
      };
    }

    revalidatePath("/materiais");
    return { success: true, message: "Item atualizado." };
  } catch (error) {
    return {
      message: friendlyErrorMessage(
        error,
        "Não foi possível salvar as alterações.",
      ),
    };
  }
}

export async function deleteItemCatalogo(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  try {
    await requireActor("materiais.edit");
    const id = text(formData, "id");

    if (!id) {
      return { message: "Item inválido." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return {
          message:
            "Este insumo já foi usado em compras ou estoque — desative-o em vez de apagar.",
        };
      }

      return {
        message: friendlyErrorMessage(error, "Não foi possível apagar o item."),
      };
    }

    revalidatePath("/materiais");
    return { success: true, message: "Item apagado." };
  } catch (error) {
    return {
      message: friendlyErrorMessage(error, "Não foi possível apagar o item."),
    };
  }
}

export async function bulkUpdateItensCatalogo(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  try {
    await requireActor("materiais.edit");
    const ids = formData.getAll("ids").map(String).filter(Boolean);
    const unidadeNome = text(formData, "unidade_nome");
    const ativo = text(formData, "ativo");

    if (ids.length === 0) {
      return { message: "Selecione ao menos um item." };
    }

    if (!unidadeNome && ativo == null) {
      return { message: "Nada para atualizar." };
    }

    const supabase = await createClient();
    const patch: { unidade_id?: string; ativo?: boolean } = {};

    if (unidadeNome) {
      const unidadeId = await resolveOrCreateUnidadeId(supabase, unidadeNome);

      if (!unidadeId) {
        return { message: "Não foi possível registrar a unidade de medida." };
      }

      patch.unidade_id = unidadeId;
    }

    if (ativo != null) {
      patch.ativo = ativo === "true";
    }

    for (const batch of chunk(ids, BULK_BATCH_SIZE)) {
      const { error } = await supabase
        .from("items")
        .update(patch)
        .in("id", batch);

      if (error) {
        return {
          message: friendlyErrorMessage(
            error,
            "Não foi possível atualizar os itens selecionados.",
          ),
        };
      }
    }

    revalidatePath("/materiais");
    return {
      success: true,
      message: `${ids.length} ${ids.length === 1 ? "item atualizado" : "itens atualizados"}.`,
    };
  } catch (error) {
    return {
      message: friendlyErrorMessage(
        error,
        "Não foi possível atualizar os itens selecionados.",
      ),
    };
  }
}

export async function bulkDeleteItensCatalogo(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  try {
    await requireActor("materiais.edit");
    const ids = formData.getAll("ids").map(String).filter(Boolean);

    if (ids.length === 0) {
      return { message: "Selecione ao menos um item." };
    }

    const supabase = await createClient();
    let apagados = 0;
    let bloqueados = 0;

    for (const batch of chunk(ids, BULK_BATCH_SIZE)) {
      const { error, count } = await supabase
        .from("items")
        .delete({ count: "exact" })
        .in("id", batch);

      if (!error) {
        apagados += count ?? batch.length;
        continue;
      }

      if (error.code !== "23503") {
        return {
          message: friendlyErrorMessage(
            error,
            "Não foi possível apagar os itens selecionados.",
          ),
        };
      }

      // Ao menos um item deste lote está em uso (pedido/estoque) — a
      // exclusão em lote falha inteira, então tenta um por um pra apagar
      // os que não têm vínculo e reportar quantos ficaram bloqueados.
      for (const id of batch) {
        const { error: itemError } = await supabase
          .from("items")
          .delete()
          .eq("id", id);

        if (itemError) {
          bloqueados += 1;
        } else {
          apagados += 1;
        }
      }
    }

    revalidatePath("/materiais");

    if (apagados === 0) {
      return {
        message:
          "Nenhum item pôde ser apagado — todos já foram usados em compras ou estoque. Desative-os em vez de apagar.",
      };
    }

    return {
      success: true,
      message:
        bloqueados > 0
          ? `${apagados} apagado(s). ${bloqueados} não pôde(ram) ser apagado(s) por já estar(em) em uso — desative-os.`
          : `${apagados} ${apagados === 1 ? "item apagado" : "itens apagados"}.`,
    };
  } catch (error) {
    return {
      message: friendlyErrorMessage(
        error,
        "Não foi possível apagar os itens selecionados.",
      ),
    };
  }
}
