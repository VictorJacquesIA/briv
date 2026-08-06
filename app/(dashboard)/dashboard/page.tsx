import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  FileClock,
  FileText,
  PackageSearch,
  Send,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDateRange } from "@/lib/date-range";
import {
  getLinkedObrasForUser,
  isAlmoxRole,
  isGestorRole,
} from "@/lib/permissions";
import { getPurchaseStatusCounts } from "@/services/compras-service";
import { listEstoqueSaldo, listRequisicoes } from "@/services/estoque-service";
import { listFerramentas } from "@/services/ferramentas-service";
import { listHistorico } from "@/services/historico-service";
import {
  listContratos,
  listLancamentos,
} from "@/services/pagamento-mo-service";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  listCacambas,
  listDesmobilizacoes,
} from "@/services/servicos-obra-service";
import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { ActivityLog } from "@/features/dashboard/components/activity-log";

type DashboardSearchParams = {
  range?: string;
  from?: string;
  to?: string;
  page?: string;
};

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
  const isAlmox = isAlmoxRole(currentProfile.role);
  const params = await searchParams;

  // Almoxarife não tem solicitacoes.view nem historico.view — os
  // indicadores de compras e o log de atividades não fazem sentido pra ele,
  // então a Home dele vira uma visão geral do estoque em vez disso.
  if (isAlmox) {
    const [itens, requisicoesPendentes, ferramentasEmprestadas] =
      await Promise.all([
        listEstoqueSaldo(),
        listRequisicoes({ status: "pendente" }),
        listFerramentas({ status: "emprestada" }),
      ]);

    const itensAbaixoDoMinimo = itens.filter(
      (item: any) =>
        item.quantidade_minima != null &&
        Number(item.quantidade_atual) < Number(item.quantidade_minima),
    );

    const almoxIndicators = [
      {
        label: "Itens abaixo do mínimo",
        value: itensAbaixoDoMinimo.length,
        icon: FileClock,
      },
      {
        label: "Requisições pendentes",
        value: requisicoesPendentes.length,
        icon: ClipboardCheck,
      },
      {
        label: "Ferramentas emprestadas",
        value: ferramentasEmprestadas.length,
        icon: Send,
      },
      {
        label: "Itens rastreados",
        value: itens.length,
        icon: CheckCircle2,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/estoque">Ver estoque</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/estoque/requisicoes">Requisições</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/estoque/ferramentas">Ferramentas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/estoque/relatorio">Relatório</Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral do estoque.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {almoxIndicators.map((indicator) => (
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens abaixo do mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left">Insumo</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-left">Quantidade atual</th>
                  </tr>
                </thead>
                <tbody>
                  {itensAbaixoDoMinimo.map((item: any) => (
                    <tr key={item.estoque_item_id} className="border-t">
                      <td className="px-3 py-2">{item.item_nome}</td>
                      <td className="px-3 py-2">{item.unidade_nome ?? "-"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="warning">
                          {Number(item.quantidade_atual).toLocaleString(
                            "pt-BR",
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {itensAbaixoDoMinimo.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="h-16 px-3 text-center text-muted-foreground"
                      >
                        Nenhum item abaixo do mínimo.
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

  const { from, to } = resolveDateRange(params);
  const page = Number(params.page ?? 1);

  // Visão de todas as solicitações e seus andamentos — pra adm_geral/compras
  // é a empresa inteira; pro gestor de obra é a mesma visão, mas só das
  // obras vinculadas a ele (RLS libera leitura tenant-wide pra todo mundo,
  // então o filtro por obra aqui é feito na aplicação, não no banco).
  const linkedObraIds = isGestorObra
    ? await getLinkedObrasForUser(currentProfile.id)
    : [];

  const [statusCounts, historico, outrasSolicitacoes] = await Promise.all([
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
          entidades: [
            "solicitacao",
            "lancamento_mo",
            "contrato_mo",
            "requisicao_almox",
            "ferramenta",
            "cacamba",
            "solicitacao_desmobilizacao",
          ],
        }),
    Promise.all([
      listLancamentos({ status: "pendente" }),
      listContratos({ status: "aberto" }),
      listRequisicoes({ status: "pendente" }),
      listCacambas({ pendente: true }),
      listDesmobilizacoes({ status: "pendente" }),
    ]).then(
      ([
        lancamentosPendentes,
        contratosAbertos,
        requisicoesPendentes,
        cacambasPendentesDb,
        desmobilizacoesPendentes,
      ]) => {
        const naObraDoGestor = (obraId: string | undefined) =>
          !isGestorObra || (!!obraId && linkedObraIds.includes(obraId));

        return {
          lancamentosPendentes: lancamentosPendentes.filter((l: any) =>
            naObraDoGestor(l.obra?.id),
          ).length,
          contratosAbertos: contratosAbertos.filter((c: any) =>
            naObraDoGestor(c.obra_id),
          ).length,
          requisicoesPendentes: requisicoesPendentes.filter((r: any) =>
            naObraDoGestor(r.obra?.id),
          ).length,
          cacambasPendentes: cacambasPendentesDb.filter((c: any) =>
            naObraDoGestor(c.obra?.id),
          ).length,
          desmobilizacoesPendentes: desmobilizacoesPendentes.filter((d: any) =>
            naObraDoGestor(d.obra?.id),
          ).length,
        };
      },
    ),
  ]);

  const indicators = [
    {
      label: "Solicitações abertas",
      value: statusCounts.abertas,
      icon: FileClock,
      href: "/compras?status=aberta",
    },
    {
      label: "Em cotação",
      value: statusCounts.emCotacao,
      icon: Clock,
      href: "/compras?status=em_cotacao",
    },
    {
      label: "Aguardando aprovação",
      value: statusCounts.aguardandoAprovacao,
      icon: ClipboardCheck,
      href: "/compras?status=aguardando_aprovacao",
    },
    {
      label: "Pedidos enviados",
      value: statusCounts.pedidosEnviados,
      icon: Send,
      href: "/compras?status=pedido_enviado",
    },
    {
      label: "Finalizadas",
      value: statusCounts.finalizadas,
      icon: CheckCircle2,
      href: "/compras?status=finalizada",
    },
  ];

  const outrasIndicators = outrasSolicitacoes
    ? [
        {
          label: "Lançamentos MO pendentes",
          value: outrasSolicitacoes.lancamentosPendentes,
          icon: Wallet,
          href: "/pagamento-mo?status=pendente",
        },
        {
          label: "Contratos de MO abertos",
          value: outrasSolicitacoes.contratosAbertos,
          icon: FileText,
          href: "/pagamento-mo/contratos?status=aberto",
        },
        {
          label: "Requisições de estoque pendentes",
          value: outrasSolicitacoes.requisicoesPendentes,
          icon: PackageSearch,
          href: "/estoque/requisicoes?status=pendente",
        },
        {
          label: "Caçambas pendentes",
          value: outrasSolicitacoes.cacambasPendentes,
          icon: Trash2,
          href: "/servicos/cacamba?filtro=pendente",
        },
        {
          label: "Desmobilizações pendentes",
          value: outrasSolicitacoes.desmobilizacoesPendentes,
          icon: Truck,
          href: "/servicos/desmobilizacao?status=pendente",
        },
      ]
    : [];

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
          {isGestorObra
            ? "Visão geral das suas solicitações e andamentos."
            : "Visão geral de todas as solicitações e seus andamentos."}
        </p>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Compras
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {indicators.map((indicator) => (
            <Link key={indicator.label} href={indicator.href as never}>
              <Card className="transition-colors hover:bg-secondary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {indicator.label}
                  </CardTitle>
                  <indicator.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {indicator.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      {outrasIndicators.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Outras solicitações
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {outrasIndicators.map((indicator) => (
              <Link key={indicator.label} href={indicator.href as never}>
                <Card className="transition-colors hover:bg-secondary">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {indicator.label}
                    </CardTitle>
                    <indicator.icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      {indicator.value}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
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
