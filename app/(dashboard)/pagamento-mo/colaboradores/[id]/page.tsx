import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  getColaborador,
  listLancamentos,
} from "@/services/pagamento-mo-service";

const TIPO_LABELS: Record<string, string> = {
  solicitacao: "Solicitação",
  vale: "Vale",
  reembolso: "Reembolso",
};

export default async function ColaboradorDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "pagamento_mo.view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [colaborador, lancamentos] = await Promise.all([
    getColaborador(id),
    listLancamentos({ colaboradorId: id }),
  ]);

  if (!colaborador) {
    notFound();
  }

  const pagos = lancamentos.filter(
    (lancamento: any) => lancamento.status === "confirmado",
  );
  const pendentes = lancamentos.filter(
    (lancamento: any) => lancamento.status === "pendente",
  );
  const totalPago = pagos.reduce(
    (soma: number, lancamento: any) => soma + Number(lancamento.valor ?? 0),
    0,
  );

  function LancamentoCard({ lancamento }: { lancamento: any }) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium">{lancamento.obra?.nome ?? "-"}</div>
          <Badge
            variant={
              lancamento.status === "confirmado" ? "default" : "secondary"
            }
          >
            {lancamento.status === "confirmado" ? "Pago" : "Pendente"}
          </Badge>
        </div>
        <div className="text-muted-foreground">
          {TIPO_LABELS[lancamento.tipo] ?? lancamento.tipo}
          {lancamento.tipo === "vale" ? (
            <>
              {" · "}
              {lancamento.vale_aplicado_em ? "Baixado" : "Em aberto"}
            </>
          ) : null}
        </div>
        <div className="font-medium">
          {lancamento.valor == null
            ? "Aguardando valor"
            : `R$ ${Number(lancamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        </div>
        {lancamento.descricao ? (
          <div className="text-xs text-muted-foreground">
            {lancamento.descricao}
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground">
          {lancamento.status === "confirmado" && lancamento.confirmado_at
            ? `Pago em ${new Date(lancamento.confirmado_at).toLocaleDateString("pt-BR")}`
            : `Lançado em ${new Date(lancamento.created_at).toLocaleDateString("pt-BR")}`}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {colaborador.nome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {colaborador.funcao ?? "Colaborador/Prestador"} ·{" "}
            {colaborador.ativo ? "Ativo" : "Inativo"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pagamento-mo/pagos">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Telefone</div>
            <div>{colaborador.telefone ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Chave Pix</div>
            <div>{colaborador.chave_pix ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Dados bancários</div>
            <div>{colaborador.dados_bancarios ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Valor diária</div>
            <div>
              {colaborador.valor_diaria != null
                ? `R$ ${Number(colaborador.valor_diaria).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "-"}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="text-xs text-muted-foreground">Total pago</div>
            <div className="text-base font-medium">
              R${" "}
              {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pagamentos confirmados ({pagos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum pagamento confirmado ainda.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pagos.map((lancamento: any) => (
                <LancamentoCard key={lancamento.id} lancamento={lancamento} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendentes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pendentes ({pendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendentes.map((lancamento: any) => (
                <LancamentoCard key={lancamento.id} lancamento={lancamento} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
