import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { listSolicitacoes, statusLabels } from "@/services/compras-service";

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    sort?: "created_at" | "prioridade" | "status";
  }>;
}) {
  const params = await searchParams;
  const result = await listSolicitacoes({
    search: params.q,
    status: params.status,
    page: Number(params.page ?? 1),
    sort: params.sort,
  });
  const solicitacoes = result.data;
  const totalPages = Math.max(Math.ceil(result.count / result.pageSize), 1);
  const baseQuery = `q=${params.q ?? ""}&status=${params.status ?? "todos"}&sort=${
    params.sort ?? "created_at"
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fluxo auditavel da solicitacao ate a finalizacao do pedido.
          </p>
        </div>
        <Button asChild>
          <Link href="/compras/nova">Nova solicitacao</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Pesquisar por codigo ou observacao"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <select
              name="status"
              defaultValue={params.status ?? "todos"}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="todos">Todos os status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={params.sort ?? "created_at"}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="created_at">Mais recentes</option>
              <option value="prioridade">Prioridade</option>
              <option value="status">Status</option>
            </select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left">Codigo</th>
                  <th className="px-4 py-3 text-left">Obra</th>
                  <th className="px-4 py-3 text-left">Prioridade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((solicitacao: any) => (
                  <tr
                    key={solicitacao.id}
                    className="border-t border-border/80"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/compras/${solicitacao.id}`}
                        className="hover:underline"
                      >
                        {solicitacao.codigo ?? solicitacao.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {solicitacao.obra?.nome ?? "-"}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {solicitacao.prioridade}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={solicitacao.status}
                        label={
                          statusLabels[solicitacao.status] ?? solicitacao.status
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      {new Date(solicitacao.created_at).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                  </tr>
                ))}
                {solicitacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-24 px-4 text-center text-muted-foreground"
                    >
                      Nenhuma solicitacao encontrada para os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <span>
              Pagina {result.page} de {totalPages} · {result.count} registro(s)
            </span>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/compras?${baseQuery}&page=${Math.max(result.page - 1, 1)}`}
                >
                  Anterior
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/compras?${baseQuery}&page=${Math.min(
                    result.page + 1,
                    totalPages,
                  )}`}
                >
                  Proxima
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
