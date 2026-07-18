import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  FileClock,
  Send,
} from "lucide-react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isGestorRole } from "@/lib/permissions";
import { getPurchaseStatusCounts } from "@/services/compras-service";
import { listHistorico } from "@/services/historico-service";
import { getCurrentProfile } from "@/services/profiles-service";
import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { ActivityLog } from "@/features/dashboard/components/activity-log";

type DashboardSearchParams = {
  range?: string;
  from?: string;
  to?: string;
  page?: string;
};

function resolveDateRange(params: DashboardSearchParams) {
  const now = new Date();

  if (params.range === "custom" && params.from && params.to) {
    return {
      from: startOfDay(new Date(params.from)).toISOString(),
      to: endOfDay(new Date(params.to)).toISOString(),
    };
  }

  if (params.range === "semana") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    };
  }

  if (params.range === "mes") {
    return {
      from: startOfMonth(now).toISOString(),
      to: endOfMonth(now).toISOString(),
    };
  }

  return {
    from: startOfDay(now).toISOString(),
    to: endOfDay(now).toISOString(),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const isGestorObra = isGestorRole(currentProfile.role);
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const page = Number(params.page ?? 1);

  const [statusCounts, historico] = await Promise.all([
    getPurchaseStatusCounts(
      isGestorObra ? { responsavelObraId: currentProfile.id } : undefined,
    ),
    isGestorObra
      ? Promise.resolve({ data: [], page: 1, pageSize: 10, count: 0 })
      : listHistorico({
          from,
          to,
          page,
          pageSize: 10,
          entidades: ["solicitacao", "lancamento_mo"],
        }),
  ]);

  const indicators = [
    {
      label: "Solicitações abertas",
      value: statusCounts.abertas,
      icon: FileClock,
    },
    { label: "Em cotação", value: statusCounts.emCotacao, icon: Clock },
    {
      label: "Aguardando aprovação",
      value: statusCounts.aguardandoAprovacao,
      icon: ClipboardCheck,
    },
    {
      label: "Pedidos enviados",
      value: statusCounts.pedidosEnviados,
      icon: Send,
    },
    {
      label: "Finalizadas",
      value: statusCounts.finalizadas,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      {isGestorObra ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/compras/nova">Nova solicitação de compra</Link>
          </Button>
          <Button asChild>
            <Link href="/pagamento-mo/novo">Pagamentos</Link>
          </Button>
        </div>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão diária do fluxo de compras.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {indicators.map((indicator) => (
          <Card key={indicator.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {indicator.label}
              </CardTitle>
              <indicator.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{indicator.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {isGestorObra ? null : (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Últimas atividades</CardTitle>
            <DateRangeFilter />
          </CardHeader>
          <CardContent>
            <ActivityLog
              atividades={historico.data}
              page={historico.page}
              pageSize={historico.pageSize}
              count={historico.count}
              basePath="/dashboard"
              searchParams={params}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
