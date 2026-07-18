import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntradaForm } from "@/features/estoque/components/entrada-form";
import { SaidaForm } from "@/features/estoque/components/saida-form";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { listEstoqueSaldo } from "@/services/estoque-service";
import { listObras } from "@/services/obras-service";

export default async function EstoquePage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "estoque.view")) {
    redirect("/dashboard");
  }

  const canRegistrarEntrada = hasPermission(
    currentProfile.role,
    permissions,
    "estoque.entrada.create",
  );
  const canRegistrarSaida = hasPermission(
    currentProfile.role,
    permissions,
    "estoque.saida.create",
  );
  const [itens, obras] = await Promise.all([
    listEstoqueSaldo(),
    canRegistrarSaida ? listObras() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Itens em depósito, quantidade disponível e movimentações.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/estoque/requisicoes">Requisições</Link>
          </Button>
          {canRegistrarSaida ? <SaidaForm obras={obras} /> : null}
          {canRegistrarEntrada ? <EntradaForm /> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens em depósito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Insumo</th>
                  <th className="px-3 py-2 text-left">Unidade</th>
                  <th className="px-3 py-2 text-left">Quantidade atual</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item: any) => {
                  const abaixoDoMinimo =
                    item.quantidade_minima != null &&
                    Number(item.quantidade_atual) <
                      Number(item.quantidade_minima);

                  return (
                    <tr key={item.estoque_item_id} className="border-t">
                      <td className="px-3 py-2">{item.item_nome}</td>
                      <td className="px-3 py-2">{item.unidade_nome ?? "-"}</td>
                      <td className="px-3 py-2">
                        {abaixoDoMinimo ? (
                          <Badge variant="warning">
                            {Number(item.quantidade_atual).toLocaleString(
                              "pt-BR",
                            )}
                          </Badge>
                        ) : (
                          Number(item.quantidade_atual).toLocaleString("pt-BR")
                        )}
                      </td>
                    </tr>
                  );
                })}
                {itens.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhum item rastreado em estoque ainda.
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
