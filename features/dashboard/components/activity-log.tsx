import Link from "next/link";

import { Button } from "@/components/ui/button";

type HistoricoRow = {
  id: string;
  acao: string;
  entidade: string;
  created_at: string;
  status_anterior: string | null;
  status_novo: string | null;
};

export function ActivityLog({
  atividades,
  page,
  pageSize,
  count,
  basePath,
  searchParams,
}: {
  atividades: HistoricoRow[];
  page: number;
  pageSize: number;
  count: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, value]) => value) as [
        string,
        string,
      ][],
    );
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="space-y-3">
      {atividades.length > 0 ? (
        atividades.map((atividade) => (
          <div key={atividade.id} className="rounded-md border p-3 text-sm">
            <div className="font-medium">{atividade.acao}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(atividade.created_at).toLocaleString("pt-BR")}
              {atividade.status_anterior || atividade.status_novo
                ? ` · ${atividade.status_anterior ?? "-"} → ${atividade.status_novo ?? "-"}`
                : ""}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma atividade no período selecionado.
        </div>
      )}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          {page <= 1 ? (
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1) as never}>Anterior</Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              Próxima
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1) as never}>Próxima</Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
