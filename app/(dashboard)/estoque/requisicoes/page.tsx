import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { listRequisicoes } from "@/services/estoque-service";

export default async function RequisicoesPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const [permissions, requisicoes] = await Promise.all([
    getPermissionsForUser(currentProfile.id),
    listRequisicoes(),
  ]);

  if (!hasPermission(currentProfile.role, permissions, "estoque.view")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Requisições ao almoxarifado
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Itens que o Compras destinou ao estoque, aguardando separação.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/estoque">Itens em depósito</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Solicitação</th>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Criada em</th>
                  <th className="px-3 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {requisicoes.map((requisicao: any) => (
                  <tr key={requisicao.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {requisicao.solicitacao?.codigo ??
                        requisicao.solicitacao?.id?.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">{requisicao.obra?.nome}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          requisicao.status === "separado"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {requisicao.status === "separado"
                          ? "Separado"
                          : "Pendente"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {new Date(requisicao.created_at).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/estoque/requisicoes/${requisicao.id}`}>
                          Abrir
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {requisicoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma requisição registrada.
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
