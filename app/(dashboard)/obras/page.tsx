import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObrasTable } from "@/features/obras/components/obras-table";
import {
  assertPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { listObras } from "@/services/obras-service";

export default async function ObrasPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  try {
    await assertPermission(currentProfile.role, permissions, "obras.view");
  } catch {
    redirect("/dashboard");
  }

  const isGestorObra = isGestorRole(currentProfile.role);
  const obras = await listObras(
    isGestorObra ? { gestorUserId: currentProfile.id } : undefined,
  );
  const canCreate = await assertPermission(
    currentProfile.role,
    permissions,
    "obras.create",
  )
    .then(() => true)
    .catch(() => false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro de obras, fase e orçamento.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/obras/nova">Nova obra</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isGestorObra ? "Suas obras" : "Todas as obras"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isGestorObra && obras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma obra vinculada ao seu usuário.
            </p>
          ) : (
            <ObrasTable data={obras} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
