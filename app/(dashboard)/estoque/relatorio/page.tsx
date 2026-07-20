import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { resolveDateRange } from "@/lib/date-range";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import {
  listEstoqueSaldo,
  listMovimentacoesEstoque,
} from "@/services/estoque-service";
import { listObras } from "@/services/obras-service";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function EstoqueRelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    obra_id?: string;
  }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "estoque.view")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const { from, to } = resolveDateRange(params);

  const [itens, entradas, saidas, obras] = await Promise.all([
    listEstoqueSaldo(),
    listMovimentacoesEstoque({ tipo: "entrada", from, to }),
    listMovimentacoesEstoque({
      tipo: "saida",
      from,
      to,
      obraId: params.obra_id,
    }),
    listObras(),
  ]);

  const obraSelecionada = params.obra_id
    ? obras.find((obra: any) => obra.id === params.obra_id)
    : null;

  const pdfQuery = new URLSearchParams({ from, to });
  if (params.obra_id) {
    pdfQuery.set("obra_id", params.obra_id);
  }
  if (obraSelecionada?.nome) {
    pdfQuery.set("obra_nome", obraSelecionada.nome);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Relatório de Estoque
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Itens em estoque, entradas e saídas, com filtro por período e obra.
          </p>
        </div>
        <Button asChild>
          <a
            href={`/api/estoque/relatorio?${pdfQuery.toString()}`}
            target="_blank"
            rel="noreferrer"
          >
            Baixar PDF
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DateRangeFilter />
          <form className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="range" value={params.range ?? ""} />
            <input type="hidden" name="from" value={params.from ?? ""} />
            <input type="hidden" name="to" value={params.to ?? ""} />
            <div className="space-y-2">
              <label
                className="text-sm text-muted-foreground"
                htmlFor="obra_id"
              >
                Obra (filtro de saídas)
              </label>
              <select
                id="obra_id"
                name="obra_id"
                defaultValue={params.obra_id ?? ""}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Todas as obras</option>
                {obras.map((obra: any) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            O filtro por obra vale apenas para a seção Saídas — entradas chegam
            no depósito sem obra vinculada.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens em estoque</CardTitle>
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
                      className="h-16 px-3 text-center text-muted-foreground"
                    >
                      Nenhum item rastreado em estoque.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Quantidade</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((mov: any) => (
                  <tr key={mov.id} className="border-t">
                    <td className="px-3 py-2">
                      {new Date(mov.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {mov.estoque_item?.item?.nome ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {Number(mov.quantidade).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">{mov.motivo ?? "-"}</td>
                  </tr>
                ))}
                {entradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-16 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma entrada no período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Quantidade</th>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {saidas.map((mov: any) => (
                  <tr key={mov.id} className="border-t">
                    <td className="px-3 py-2">
                      {new Date(mov.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {mov.estoque_item?.item?.nome ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {Number(mov.quantidade).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">{mov.obra?.nome ?? "-"}</td>
                    <td className="px-3 py-2">{mov.motivo ?? "-"}</td>
                  </tr>
                ))}
                {saidas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-16 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma saída no período/obra selecionados.
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
