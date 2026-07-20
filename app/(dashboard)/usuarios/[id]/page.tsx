import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EditAccountForm } from "@/features/usuarios/components/edit-account-form";
import {
  defaultPermissionsForRole,
  getPermissionsForUser,
  hasPermission,
  isGestorRole,
  normalizeRole,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  toPermissionMap,
} from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  deleteUser,
  updateObraVinculos,
  updateUserPermissions,
} from "../actions";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const currentPermissions = await getPermissionsForUser(currentProfile.id);

  if (
    !hasPermission(currentProfile.role, currentPermissions, "usuarios.manage")
  ) {
    redirect("/usuarios");
  }

  const supabase = (await createClient()) as any;
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id,nome,role,ativo,cliente_id")
    .eq("id", id)
    .single();

  if (!targetProfile) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(id);
  const targetEmail = authUser?.user?.email ?? null;

  const targetRole = normalizeRole(targetProfile.role);
  const { data: permissionRows } = await supabase
    .from("user_permissions")
    .select("permission_key,allowed")
    .eq("user_id", id);
  const targetPermissions = toPermissionMap(permissionRows);
  const defaults = defaultPermissionsForRole(targetRole);

  let obras: any[] = [];
  let linkedObraIds: string[] = [];

  if (isGestorRole(targetRole)) {
    const [{ data: obraRows }, { data: vinculoRows }] = await Promise.all([
      supabase
        .from("obras")
        .select("id,nome")
        .eq("cliente_id", targetProfile.cliente_id)
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("obra_usuarios")
        .select("obra_id")
        .eq("user_id", id)
        .eq("ativo", true),
    ]);
    obras = obraRows ?? [];
    linkedObraIds = (vinculoRows ?? []).map(
      (row: { obra_id: string }) => row.obra_id,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {targetProfile.nome ?? "Usuário"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ROLE_LABELS[targetRole]} ·{" "}
            {targetProfile.ativo ? "Ativo" : "Inativo"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/usuarios">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <EditAccountForm
            profileId={targetProfile.id}
            nome={targetProfile.nome ?? ""}
            email={targetEmail}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Excluir usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Remove o acesso e o cadastro deste usuário permanentemente. Essa
            ação não pode ser desfeita.
          </p>
          <form action={deleteUser}>
            <input type="hidden" name="profileId" value={targetProfile.id} />
            <ConfirmSubmitButton
              type="submit"
              variant="destructive"
              message={`Excluir permanentemente o usuário "${targetProfile.nome ?? "sem nome"}"? Essa ação não pode ser desfeita.`}
            >
              Excluir usuário
            </ConfirmSubmitButton>
          </form>
        </CardContent>
      </Card>

      {targetRole === "adm_geral" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissões</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Usuários com papel Administrador têm acesso total, sem necessidade
            de configuração.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissões</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateUserPermissions} className="space-y-4">
              <input type="hidden" name="profileId" value={targetProfile.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                {PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`perm_${key}`}
                      defaultChecked={targetPermissions[key] ?? defaults[key]}
                      className="size-4 rounded border"
                    />
                    {PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
              <Button type="submit">Salvar permissões</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isGestorRole(targetRole) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Obras vinculadas</CardTitle>
          </CardHeader>
          <CardContent>
            {obras.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma obra ativa cadastrada para este cliente ainda.
              </p>
            ) : (
              <form action={updateObraVinculos} className="space-y-4">
                <input
                  type="hidden"
                  name="profileId"
                  value={targetProfile.id}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {obras.map((obra) => (
                    <label
                      key={obra.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="obra_id"
                        value={obra.id}
                        defaultChecked={linkedObraIds.includes(obra.id)}
                        className="size-4 rounded border"
                      />
                      {obra.nome}
                    </label>
                  ))}
                </div>
                <Button type="submit">Salvar obras vinculadas</Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
