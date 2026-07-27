import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  isAdminRole,
  isComprasRole,
  toPermissionMap,
  type PermissionKey,
} from "@/lib/permissions-shared";

export * from "@/lib/permissions-shared";

// Memoizado por requisição pelo mesmo motivo de getCurrentProfile: layout +
// página quase sempre buscam as permissões do mesmo usuário de novo.
export const getPermissionsForUser = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_permissions")
    .select("permission_key,allowed")
    .eq("user_id", userId);

  return toPermissionMap(data ?? []);
});

export async function getLinkedObrasForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("obra_usuarios")
    .select("obra_id")
    .eq("user_id", userId)
    .eq("ativo", true);

  return (data ?? []).map((row: { obra_id: string }) => row.obra_id);
}

export async function canAccessObra(
  role: string | null | undefined,
  permissions: Record<string, boolean> | undefined,
  obraId: string | null | undefined,
  linkedObras: string[] = [],
) {
  if (isAdminRole(role)) {
    return true;
  }

  if (!obraId) {
    return false;
  }

  if (isComprasRole(role)) {
    return hasPermission(role, permissions, "obras.view");
  }

  return linkedObras.includes(obraId);
}

export async function assertPermission(
  role: string | null | undefined,
  permissions: Record<string, boolean> | undefined,
  permission: PermissionKey,
) {
  if (!hasPermission(role, permissions, permission)) {
    throw new Error("Acesso negado.");
  }
}
