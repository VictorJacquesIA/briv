import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createUnidade,
  toggleUnidadeAtivo,
} from "@/features/materiais/actions/materiais-actions";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function UnidadesPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "materiais.view")) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(
    currentProfile.role,
    permissions,
    "materiais.create",
  );
  const canEdit = hasPermission(
    currentProfile.role,
    permissions,
    "materiais.edit",
  );

  const supabase = (await createClient()) as any;
  const { data: unidades } = await supabase
    .from("unidades")
    .select("id,nome,codigo,ativo")
    .order("nome");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unidades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unidades de medida do catálogo de materiais.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/materiais">Voltar</Link>
        </Button>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createUnidade}
              className="grid gap-3 lg:grid-cols-[2fr_1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  name="nome"
                  placeholder="ex: unidade"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" name="codigo" placeholder="ex: un" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Adicionar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unidades cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {canEdit ? (
                    <th className="px-3 py-2 text-left">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {(unidades ?? []).map((unidade: any) => (
                  <tr key={unidade.id} className="border-t">
                    <td className="px-3 py-2">{unidade.nome}</td>
                    <td className="px-3 py-2">{unidade.codigo ?? "-"}</td>
                    <td className="px-3 py-2">
                      {unidade.ativo ? "Ativa" : "Inativa"}
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-2">
                        <form action={toggleUnidadeAtivo}>
                          <input type="hidden" name="id" value={unidade.id} />
                          <input
                            type="hidden"
                            name="ativo"
                            value={String(unidade.ativo)}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            {unidade.ativo ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {(unidades ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma unidade cadastrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
