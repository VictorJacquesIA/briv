import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  getPermissionsForUser,
  hasPermission,
  normalizeRole,
  ROLE_LABELS,
} from "@/lib/permissions";
import { updateUserRole } from "./actions";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "nome" | "role" | "ativo"
>;

export default async function UsuariosPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "configuracoes.view")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,nome,role,ativo")
    .order("nome");

  const profileRows = (profiles ?? []) as ProfileRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Usuários e Permissões
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie papéis, permissões e vínculo de gestores às obras.
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission(
            currentProfile.role,
            permissions,
            "usuarios.manage",
          ) ? (
            <Button asChild>
              <Link href="/usuarios/novo">Novo usuário</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/dashboard">Voltar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulo administrativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Atualize o papel de cada usuário para controlar o acesso ao sistema.
          </p>

          <div className="space-y-3">
            {profileRows.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/usuarios/${profile.id}`}
                    className="font-medium hover:underline"
                  >
                    {profile.nome ?? "Usuário sem nome"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {profile.ativo ? "Ativo" : "Inativo"} ·{" "}
                    {ROLE_LABELS[normalizeRole(profile.role)]}
                  </p>
                </div>

                <form
                  action={updateUserRole}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="profileId" value={profile.id} />
                  <select
                    name="role"
                    defaultValue={profile.role ?? "gestor_obra"}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm">
                    Salvar
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
