import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmarSeparacaoForm } from "@/features/estoque/components/confirmar-separacao-form";
import { PrintButton } from "@/features/estoque/components/print-button";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { getRequisicaoDetail } from "@/services/estoque-service";

export default async function RequisicaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const [permissions, requisicao] = await Promise.all([
    getPermissionsForUser(currentProfile.id),
    getRequisicaoDetail(id),
  ]);

  if (!hasPermission(currentProfile.role, permissions, "estoque.view")) {
    redirect("/dashboard");
  }

  const canConfirm = hasPermission(
    currentProfile.role,
    permissions,
    "estoque.requisicao.confirm",
  );

  if (!requisicao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <style>
        {"@media print { @page { size: 80mm auto; margin: 4mm; } }"}
      </style>

      <div
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        data-no-print
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Requisição —{" "}
            {requisicao.solicitacao?.codigo ?? requisicao.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Badge
              variant={
                requisicao.status === "separado" ? "default" : "secondary"
              }
            >
              {requisicao.status === "separado" ? "Separado" : "Pendente"}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Button asChild variant="outline">
            <Link href="/estoque/requisicoes">Voltar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Obra de destino:</span>{" "}
            {requisicao.obra?.nome}
          </p>
          <p>
            <span className="text-muted-foreground">
              Solicitação de origem:
            </span>{" "}
            {requisicao.solicitacao?.codigo ?? "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens</CardTitle>
        </CardHeader>
        <CardContent>
          {requisicao.status === "pendente" && canConfirm ? (
            <ConfirmarSeparacaoForm
              requisicaoId={requisicao.id}
              itens={requisicao.itens ?? []}
            />
          ) : (
            <ItensReadOnly
              itens={requisicao.itens ?? []}
              separado={requisicao.status === "separado"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ItensReadOnly({
  itens,
  separado,
}: {
  itens: any[];
  separado?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="px-3 py-2 text-left">Insumo</th>
            <th className="px-3 py-2 text-left">Solicitado</th>
            {separado ? (
              <th className="px-3 py-2 text-left">Separado</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {itens.map((item: any) => (
            <tr key={item.id} className="border-t">
              <td className="px-3 py-2">{item.solicitacao_item?.descricao}</td>
              <td className="px-3 py-2">
                {Number(item.quantidade_solicitada).toLocaleString("pt-BR")}{" "}
                {item.solicitacao_item?.unidade}
              </td>
              {separado ? (
                <td className="px-3 py-2">
                  {item.quantidade_separada != null
                    ? Number(item.quantidade_separada).toLocaleString("pt-BR")
                    : "-"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
