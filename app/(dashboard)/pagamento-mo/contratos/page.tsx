import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MobileCard,
  MobileCardEmpty,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { listContratos } from "@/services/pagamento-mo-service";

const STATUS_FILTRO_LABELS: Record<string, string> = {
  aberto: "Abertos",
  quitado: "Quitados",
};

export default async function ContratosMoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "pagamento_mo.view")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status =
    params.status === "aberto" || params.status === "quitado"
      ? params.status
      : undefined;
  const contratos = await listContratos({ status });

  function StatusContrato({ contrato }: { contrato: any }) {
    return (
      <Badge variant={contrato.status === "quitado" ? "default" : "secondary"}>
        {contrato.status === "quitado" ? "Quitado" : "Aberto"}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Contratos (Prestação de Serviço)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Valor fechado com um prestador para uma obra, pago à vista ou em
            parcelas.
          </p>
          {status ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Filtrando por: {STATUS_FILTRO_LABELS[status]} ·{" "}
              <Link href="/pagamento-mo/contratos" className="underline">
                Ver todos
              </Link>
            </p>
          ) : null}
        </div>
        <Button asChild>
          <Link href="/pagamento-mo/contratos/novo">Novo contrato</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Prestador</th>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Serviço</th>
                  <th className="px-3 py-2 text-left">Valor total</th>
                  <th className="px-3 py-2 text-left">Saldo restante</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato: any) => (
                  <tr key={contrato.contrato_id} className="border-t">
                    <td className="px-3 py-2">{contrato.colaborador_nome}</td>
                    <td className="px-3 py-2">{contrato.obra_nome}</td>
                    <td className="px-3 py-2">{contrato.descricao}</td>
                    <td className="px-3 py-2">
                      R${" "}
                      {Number(contrato.valor_total).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      R${" "}
                      {Number(contrato.saldo_restante).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <StatusContrato contrato={contrato} />
                    </td>
                  </tr>
                ))}
                {contratos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhum contrato cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {contratos.length === 0 ? (
            <MobileCardEmpty>Nenhum contrato cadastrado.</MobileCardEmpty>
          ) : (
            <MobileCardList>
              {contratos.map((contrato: any) => (
                <MobileCard key={contrato.contrato_id}>
                  <MobileCardRow label="Prestador">
                    {contrato.colaborador_nome}
                  </MobileCardRow>
                  <MobileCardRow label="Obra">
                    {contrato.obra_nome}
                  </MobileCardRow>
                  <MobileCardRow label="Serviço">
                    {contrato.descricao}
                  </MobileCardRow>
                  <MobileCardRow label="Valor total">
                    R${" "}
                    {Number(contrato.valor_total).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </MobileCardRow>
                  <MobileCardRow label="Saldo restante">
                    R${" "}
                    {Number(contrato.saldo_restante).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </MobileCardRow>
                  <MobileCardRow label="Status">
                    <StatusContrato contrato={contrato} />
                  </MobileCardRow>
                </MobileCard>
              ))}
            </MobileCardList>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
