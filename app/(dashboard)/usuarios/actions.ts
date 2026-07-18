"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import {
  assertPermission,
  defaultPermissionsForRole,
  getPermissionsForUser,
  normalizeRole,
  PERMISSION_KEYS,
} from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { registrarHistorico } from "@/services/historico-service";
import { getRequestContext } from "@/services/request-context";
import { createUserSchema } from "@/features/usuarios/schemas/create-user-schema";

export type UsuariosActionState = {
  message?: string;
};

export async function updateUserRole(formData: FormData) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);
  await assertPermission(currentProfile.role, permissions, "usuarios.manage");

  if (!currentProfile.cliente_id) {
    throw new Error("Seu usuário não está vinculado a um cliente.");
  }

  const profileId = String(formData.get("profileId") ?? "").trim();
  const role = normalizeRole(String(formData.get("role") ?? ""));

  if (!profileId || !role) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("role,cliente_id")
    .eq("id", profileId)
    .single();

  if (fetchError || !target) {
    throw new Error("Usuário não encontrado.");
  }

  const statusAnterior = target.role;

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId);

  if (error) {
    throw new Error("Não foi possível atualizar o usuário.");
  }

  // Linhas antigas de user_permissions ficariam presas contra os defaults do
  // papel anterior — reseedar do zero evita reinterpretação incorreta.
  await supabase.from("user_permissions").delete().eq("user_id", profileId);

  if (role !== "adm_geral") {
    const defaults = defaultPermissionsForRole(role);
    const rows = PERMISSION_KEYS.map((key) => ({
      user_id: profileId,
      permission_key: key,
      allowed: defaults[key],
    }));
    await supabase.from("user_permissions").insert(rows);
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: target.cliente_id ?? currentProfile.cliente_id,
    actorId: currentProfile.id,
    entidade: "usuario",
    entidadeId: profileId,
    acao: "role_alterada",
    statusAnterior,
    statusNovo: role,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${profileId}`);
}

export async function createUser(
  _state: UsuariosActionState,
  formData: FormData,
): Promise<UsuariosActionState> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  try {
    await assertPermission(currentProfile.role, permissions, "usuarios.manage");
  } catch {
    return { message: "Acesso negado." };
  }

  if (!currentProfile.cliente_id) {
    return { message: "Seu usuário não está vinculado a um cliente." };
  }

  const parsed = createUserSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.senha,
      email_confirm: true,
    });

  if (createError || !created?.user) {
    const message = createError?.message?.toLowerCase() ?? "";
    if (
      createError?.code === "email_exists" ||
      message.includes("already been registered")
    ) {
      return { message: "Já existe um usuário com este e-mail." };
    }
    return {
      message: friendlyErrorMessage(
        createError,
        "Não foi possível criar o usuário.",
      ),
    };
  }

  const { error: profileError } = await (admin as any).from("profiles").insert({
    id: created.user.id,
    nome: parsed.data.nome,
    role: parsed.data.role,
    cliente_id: currentProfile.cliente_id,
    ativo: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { message: "Não foi possível criar o perfil do usuário." };
  }

  if (parsed.data.role !== "adm_geral") {
    const defaults = defaultPermissionsForRole(parsed.data.role);
    const rows = PERMISSION_KEYS.map((key) => ({
      user_id: created.user.id,
      permission_key: key,
      allowed: defaults[key],
    }));
    await (admin as any).from("user_permissions").insert(rows);
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUserPermissions(formData: FormData) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);
  await assertPermission(currentProfile.role, permissions, "usuarios.manage");

  if (!currentProfile.cliente_id) {
    throw new Error("Seu usuário não está vinculado a um cliente.");
  }

  const targetId = String(formData.get("profileId") ?? "").trim();

  if (!targetId) {
    throw new Error("Dados inválidos.");
  }

  const rows = PERMISSION_KEYS.map((key) => ({
    user_id: targetId,
    permission_key: key,
    allowed: formData.get(`perm_${key}`) === "on",
  }));

  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("user_permissions")
    .upsert(rows, { onConflict: "user_id,permission_key" });

  if (error) {
    throw new Error("Não foi possível atualizar as permissões.");
  }

  const context = await getRequestContext();
  await registrarHistorico({
    clienteId: currentProfile.cliente_id,
    actorId: currentProfile.id,
    entidade: "usuario",
    entidadeId: targetId,
    acao: "permissoes_alteradas",
    ip: context.ip,
    userAgent: context.userAgent,
    dados: {
      permissoes: rows.map(({ permission_key, allowed }) => ({
        permission_key,
        allowed,
      })),
    },
  });

  revalidatePath(`/usuarios/${targetId}`);
  revalidatePath("/usuarios");
}

export async function updateObraVinculos(formData: FormData) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);
  await assertPermission(currentProfile.role, permissions, "usuarios.manage");

  const targetId = String(formData.get("profileId") ?? "").trim();
  const obraIds = formData.getAll("obra_id").map(String);

  if (!targetId) {
    throw new Error("Dados inválidos.");
  }

  const supabase = (await createClient()) as any;

  await supabase.from("obra_usuarios").delete().eq("user_id", targetId);

  if (obraIds.length > 0) {
    const rows = obraIds.map((obraId) => ({
      obra_id: obraId,
      user_id: targetId,
      papel_na_obra: "gestor",
      ativo: true,
    }));
    const { error } = await supabase.from("obra_usuarios").insert(rows);

    if (error) {
      throw new Error("Não foi possível atualizar as obras vinculadas.");
    }
  }

  revalidatePath(`/usuarios/${targetId}`);
}
