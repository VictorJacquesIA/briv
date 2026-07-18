import { redirect } from "next/navigation";

import { assertPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";

/**
 * Resolves the current authenticated profile, redirecting to /login if
 * there's no session, and asserts it holds `permission` (which itself
 * requires a cliente_id, since every permission check is tenant-scoped).
 */
export async function requireActor(
  permission: Parameters<typeof assertPermission>[2],
) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  if (!currentProfile.cliente_id) {
    throw new Error("Seu usuário não está vinculado a um cliente.");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);
  await assertPermission(currentProfile.role, permissions, permission);

  return currentProfile;
}
