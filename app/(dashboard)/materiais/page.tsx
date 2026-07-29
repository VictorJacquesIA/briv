import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItemCatalogo } from "@/features/materiais/actions/materiais-actions";
import { CatalogoTable } from "@/features/materiais/components/catalogo-table";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function MateriaisPage() {
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

  const supabase = await createClient();
  const [{ data: items }, { data: unidades }] = await Promise.all([
    supabase
      .from("items")
      .select("id,nome,descricao,ativo,unidade:unidades(nome)")
      .order("nome"),
    supabase.from("unidades").select("id,nome").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materiais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo global de itens usado nas solicitações de compra.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/materiais/unidades">Unidades</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/materiais/importar">Importar CSV</Link>
          </Button>
        </div>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo item</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createItemCatalogo}
              className="grid gap-3 lg:grid-cols-[2fr_2fr_1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade_nome">Unidade</Label>
                <Input
                  id="unidade_nome"
                  name="unidade_nome"
                  list="unidades-sugestoes"
                  placeholder="ex: unidade, kg, m²..."
                  required
                />
                <datalist id="unidades-sugestoes">
                  {(unidades ?? []).map((unidade: any) => (
                    <option key={unidade.id} value={unidade.nome} />
                  ))}
                </datalist>
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
          <CardTitle className="text-base">Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogoTable
            items={items ?? []}
            unidades={unidades ?? []}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
