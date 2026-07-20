import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  registrarEntradaFerramenta,
  registrarSaidaFerramenta,
} from "@/features/ferramentas/actions";
import { FerramentaForm } from "@/features/ferramentas/components/ferramenta-form";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { listFerramentas } from "@/services/ferramentas-service";
import { listObras } from "@/services/obras-service";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function FerramentasPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "ferramentas.view")) {
    redirect("/dashboard");
  }

  const canCadastrar = hasPermission(
    currentProfile.role,
    permissions,
    "ferramentas.create",
  );
  const canEmprestar = hasPermission(
    currentProfile.role,
    permissions,
    "ferramentas.saida.create",
  );
  const canDevolver = hasPermission(
    currentProfile.role,
    permissions,
    "ferramentas.entrada.create",
  );

  const [ferramentas, obras] = await Promise.all([
    listFerramentas(),
    canEmprestar ? listObras() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ferramentas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle individual das ferramentas da empresa — depósito ou
            emprestada pra uma obra.
          </p>
        </div>
        {canCadastrar ? <FerramentaForm /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ferramentas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {canEmprestar || canDevolver ? (
                    <th className="px-3 py-2 text-left">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {ferramentas.map((ferramenta: any) => (
                  <tr key={ferramenta.id} className="border-t">
                    <td className="px-3 py-2">{ferramenta.nome}</td>
                    <td className="px-3 py-2">{ferramenta.codigo ?? "-"}</td>
                    <td className="px-3 py-2">
                      {ferramenta.status === "emprestada" ? (
                        <Badge variant="warning">
                          Emprestada — {ferramenta.obra_atual?.nome ?? "-"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No depósito</Badge>
                      )}
                    </td>
                    {canEmprestar || canDevolver ? (
                      <td className="px-3 py-2">
                        {ferramenta.status === "deposito" && canEmprestar ? (
                          <form
                            action={registrarSaidaFerramenta}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="ferramenta_id"
                              value={ferramenta.id}
                            />
                            <select
                              name="obra_id"
                              required
                              className="h-9 rounded-md border bg-background px-2 text-sm"
                            >
                              <option value="">Obra de destino</option>
                              {obras.map((obra: any) => (
                                <option key={obra.id} value={obra.id}>
                                  {obra.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                            >
                              Emprestar
                            </button>
                          </form>
                        ) : null}
                        {ferramenta.status === "emprestada" && canDevolver ? (
                          <form action={registrarEntradaFerramenta}>
                            <input
                              type="hidden"
                              name="ferramenta_id"
                              value={ferramenta.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                            >
                              Devolver
                            </button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
                {ferramentas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma ferramenta cadastrada.
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
