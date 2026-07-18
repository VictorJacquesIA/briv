import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoUsuarioForm } from "@/features/usuarios/components/novo-usuario-form";
import { getPermissionsForUser, hasPermission } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function NovoUsuarioPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "usuarios.manage")) {
    redirect("/usuarios");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Novo usuário
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cria a conta de acesso e o perfil dentro do seu cliente.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/usuarios">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoUsuarioForm />
        </CardContent>
      </Card>
    </div>
  );
}
