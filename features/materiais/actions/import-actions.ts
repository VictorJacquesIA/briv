"use server";

import Papa from "papaparse";

import { createClient } from "@/lib/supabase/server";
import { assertPermission, getPermissionsForUser } from "@/lib/permissions";
import { friendlyErrorMessage } from "@/lib/error-message";
import { getCurrentProfile } from "@/services/profiles-service";

export type ImportActionState = {
  message?: string;
  criados?: number;
  ignorados?: number;
  erros?: number;
};

async function requireActor() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    throw new Error("Sessão expirada.");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);
  await assertPermission(currentProfile.role, permissions, "materiais.import");

  return currentProfile;
}

async function readCsvFile(
  formData: FormData,
): Promise<Record<string, string>[]> {
  const file = formData.get("csv");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo CSV.");
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}

export async function importUnidadesCsv(
  _state: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  try {
    await requireActor();
    const rows = await readCsvFile(formData);
    const supabase = (await createClient()) as any;

    let criados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const row of rows) {
      const nome = row.nome?.trim();

      if (!nome) {
        erros += 1;
        continue;
      }

      const { data: existing } = await supabase
        .from("unidades")
        .select("id")
        .ilike("nome", nome)
        .maybeSingle();

      if (existing) {
        ignorados += 1;
        continue;
      }

      const { error } = await supabase
        .from("unidades")
        .insert({ nome, codigo: row.codigo?.trim() || null });

      if (error) {
        erros += 1;
      } else {
        criados += 1;
      }
    }

    return {
      message: `${criados} criadas, ${ignorados} já existentes, ${erros} com erro.`,
      criados,
      ignorados,
      erros,
    };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}

export async function importItemsCsv(
  _state: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  try {
    await requireActor();
    const rows = await readCsvFile(formData);
    const supabase = (await createClient()) as any;

    let criados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const row of rows) {
      const nome = row.nome?.trim();

      if (!nome) {
        erros += 1;
        continue;
      }

      const { data: existing } = await supabase
        .from("items")
        .select("id")
        .ilike("nome", nome)
        .maybeSingle();

      if (existing) {
        ignorados += 1;
        continue;
      }

      let unidadeId: string | null = null;
      const unidadeNome = row.unidade?.trim();

      if (unidadeNome) {
        const { data: unidade } = await supabase
          .from("unidades")
          .select("id")
          .ilike("nome", unidadeNome)
          .maybeSingle();
        unidadeId = unidade?.id ?? null;
      }

      const { error } = await supabase.from("items").insert({
        nome,
        descricao: row.descricao?.trim() || null,
        unidade_id: unidadeId,
      });

      if (error) {
        erros += 1;
      } else {
        criados += 1;
      }
    }

    return {
      message: `${criados} criados, ${ignorados} já existentes, ${erros} com erro.`,
      criados,
      ignorados,
      erros,
    };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}
