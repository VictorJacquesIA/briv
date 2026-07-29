import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createColaborador } from "@/features/pagamento-mo/actions/mo-actions";
import { ColaboradoresTable } from "@/features/pagamento-mo/components/colaboradores-table";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { listColaboradores } from "@/services/pagamento-mo-service";

export default async function ColaboradoresPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "pagamento_mo.view")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(
    currentProfile.role,
    permissions,
    "pagamento_mo.confirm",
  );
  const colaboradores = await listColaboradores();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Colaboradores/Prestadores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro simples — colaboradores/prestadores não têm acesso ao
            sistema.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pagamento-mo">Voltar</Link>
        </Button>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Novo colaborador/prestador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createColaborador}
              className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcao">Função</Label>
                <Input id="funcao" name="funcao" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chave_pix">Chave Pix</Label>
                <Input id="chave_pix" name="chave_pix" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2 lg:col-span-5">
                <Label htmlFor="observacao">Observação</Label>
                <textarea
                  id="observacao"
                  name="observacao"
                  className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Alguma informação adicional sobre este colaborador/prestador..."
                />
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Todos os colaboradores/prestadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ColaboradoresTable
            colaboradores={colaboradores}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
