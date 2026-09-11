import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MobileCard,
  MobileCardActions,
  MobileCardEmpty,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
import {
  registrarEntradaFerramenta,
  registrarSaidaFerramenta,
} from "@/features/ferramentas/actions";
import { FerramentaForm } from "@/features/ferramentas/components/ferramenta-form";
import { GerarRelatorioLocadasButton } from "@/features/ferramentas/components/gerar-relatorio-locadas-button";
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

  const ferramentasProprias = ferramentas.filter(
    (ferramenta: any) => ferramenta.status !== "locada",
  );
  const ferramentasLocadas = ferramentas.filter(
    (ferramenta: any) => ferramenta.status === "locada",
  );
  const totalLocado = ferramentasLocadas.reduce(
    (soma: number, ferramenta: any) =>
      soma + Number(ferramenta.valor_locacao ?? 0),
    0,
  );

  // Agrupado por fornecedor pra permitir "Gerar PDF" por locadora — cada
  // fornecedor pode ter dezenas de ferramentas espalhadas em várias obras,
  // então o relatório separado facilita conferência/pagamento por locadora.
  const locadasPorFornecedor = new Map<
    string,
    { fornecedor: any; itens: any[] }
  >();
  for (const ferramenta of ferramentasLocadas) {
    const key = ferramenta.fornecedor?.id ?? "sem-fornecedor";
    if (!locadasPorFornecedor.has(key)) {
      locadasPorFornecedor.set(key, {
        fornecedor: ferramenta.fornecedor,
        itens: [],
      });
    }
    locadasPorFornecedor.get(key)!.itens.push(ferramenta);
  }

  function StatusFerramenta({ ferramenta }: { ferramenta: any }) {
    return ferramenta.status === "emprestada" ? (
      <Badge variant="warning">
        Emprestada — {ferramenta.obra_atual?.nome ?? "-"}
      </Badge>
    ) : (
      <Badge variant="secondary">No depósito</Badge>
    );
  }

  function AcoesFerramenta({ ferramenta }: { ferramenta: any }) {
    if (!canEmprestar && !canDevolver) return null;
    return (
      <>
        {ferramenta.status === "deposito" && canEmprestar ? (
          <form
            action={registrarSaidaFerramenta}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="ferramenta_id" value={ferramenta.id} />
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
            <input type="hidden" name="ferramenta_id" value={ferramenta.id} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
            >
              Devolver
            </button>
          </form>
        ) : null}
      </>
    );
  }

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
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
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
                {ferramentasProprias.map((ferramenta: any) => (
                  <tr key={ferramenta.id} className="border-t">
                    <td className="px-3 py-2">{ferramenta.nome}</td>
                    <td className="px-3 py-2">{ferramenta.codigo ?? "-"}</td>
                    <td className="px-3 py-2">
                      <StatusFerramenta ferramenta={ferramenta} />
                    </td>
                    {canEmprestar || canDevolver ? (
                      <td className="px-3 py-2">
                        <AcoesFerramenta ferramenta={ferramenta} />
                      </td>
                    ) : null}
                  </tr>
                ))}
                {ferramentasProprias.length === 0 ? (
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

          {ferramentasProprias.length === 0 ? (
            <MobileCardEmpty>Nenhuma ferramenta cadastrada.</MobileCardEmpty>
          ) : (
            <MobileCardList>
              {ferramentasProprias.map((ferramenta: any) => (
                <MobileCard key={ferramenta.id}>
                  <MobileCardRow label="Nome">{ferramenta.nome}</MobileCardRow>
                  <MobileCardRow label="Código">
                    {ferramenta.codigo ?? "-"}
                  </MobileCardRow>
                  <MobileCardRow label="Status">
                    <StatusFerramenta ferramenta={ferramenta} />
                  </MobileCardRow>
                  {canEmprestar || canDevolver ? (
                    <MobileCardActions>
                      <AcoesFerramenta ferramenta={ferramenta} />
                    </MobileCardActions>
                  ) : null}
                </MobileCard>
              ))}
            </MobileCardList>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ferramentas Locadas
            {ferramentasLocadas.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Total: R${" "}
                {totalLocado.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {locadasPorFornecedor.size === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma ferramenta locada de fornecedor externo.
            </div>
          ) : (
            Array.from(locadasPorFornecedor.entries()).map(
              ([key, { fornecedor, itens }]) => {
                const subtotal = itens.reduce(
                  (soma: number, ferramenta: any) =>
                    soma + Number(ferramenta.valor_locacao ?? 0),
                  0,
                );

                return (
                  <div key={key} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {fornecedor?.nome_fantasia ??
                            fornecedor?.razao_social ??
                            "Sem fornecedor"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {itens.length}{" "}
                          {itens.length === 1 ? "ferramenta" : "ferramentas"} ·
                          R${" "}
                          {subtotal.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {fornecedor?.id ? (
                        <GerarRelatorioLocadasButton
                          fornecedorId={fornecedor.id}
                        />
                      ) : null}
                    </div>

                    <div className="divide-y divide-border rounded-lg border border-border bg-card">
                      {itens.map((ferramenta: any) => (
                        <div
                          key={ferramenta.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">{ferramenta.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {ferramenta.codigo
                                ? `Patrimônio ${ferramenta.codigo} · `
                                : ""}
                              {ferramenta.obra_atual?.nome ?? "-"}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div className="text-sm font-medium text-foreground">
                              R${" "}
                              {Number(
                                ferramenta.valor_locacao ?? 0,
                              ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            <div>
                              Entregue em{" "}
                              {ferramenta.entregue_em
                                ? new Date(
                                    ferramenta.entregue_em,
                                  ).toLocaleDateString("pt-BR")
                                : "-"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              },
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
