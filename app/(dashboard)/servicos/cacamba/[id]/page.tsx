import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { getCacambaDetail } from "@/services/servicos-obra-service";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  solicitada: "Solicitada",
  ativa: "Ativa",
  encerrada: "Encerrada",
};

const EVENTO_LABELS: Record<string, string> = {
  entrega: "Entrega",
  pedido_troca: "Pedido de troca",
  troca_confirmada: "Troca confirmada",
  pedido_devolucao: "Pedido de devolução",
  devolucao_confirmada: "Devolução confirmada",
};

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function CacambaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "cacamba.view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const cacamba = await getCacambaDetail(id);

  if (!cacamba) {
    notFound();
  }

  const eventos = cacamba.eventos ?? [];
  const trocasConfirmadas = eventos.filter(
    (evento: any) => evento.tipo === "troca_confirmada",
  ).length;
  const trocasPedidas = eventos.filter(
    (evento: any) => evento.tipo === "pedido_troca",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Caçamba — {cacamba.obra?.nome ?? "-"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trocasConfirmadas === 0
              ? "Nenhuma troca até agora."
              : trocasConfirmadas === 1
                ? "1 troca confirmada."
                : `${trocasConfirmadas} trocas confirmadas.`}
            {trocasPedidas > trocasConfirmadas
              ? ` ${trocasPedidas - trocasConfirmadas} pedido(s) de troca ainda não confirmado(s).`
              : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/servicos/cacamba">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Tipo</div>
            <div>{cacamba.tipo}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <div>
              <Badge
                variant={
                  cacamba.status === "ativa"
                    ? "default"
                    : cacamba.status === "encerrada"
                      ? "outline"
                      : "secondary"
                }
              >
                {STATUS_LABELS[cacamba.status] ?? cacamba.status}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Centro de custo</div>
            <div>{cacamba.orcamento_item?.descricao ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Valor</div>
            <div>
              {cacamba.valor != null
                ? Number(cacamba.valor).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Data prevista</div>
            <div>{formatarData(cacamba.data_prevista)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fornecedor</div>
            <div>
              {cacamba.fornecedor?.nome_fantasia ??
                cacamba.fornecedor?.razao_social ??
                "-"}
            </div>
          </div>
          {cacamba.observacao ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-muted-foreground">Observação</div>
              <div>{cacamba.observacao}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum evento registrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {eventos.map((evento: any) => (
                <div
                  key={evento.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {EVENTO_LABELS[evento.tipo] ?? evento.tipo}
                    </div>
                    {evento.observacao ? (
                      <div className="text-xs text-muted-foreground">
                        {evento.observacao}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {evento.responsavel?.nome ?? "-"} ·{" "}
                    {new Date(evento.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
