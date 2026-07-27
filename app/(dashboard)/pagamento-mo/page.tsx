import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  confirmarLancamento,
  darBaixaVale,
} from "@/features/pagamento-mo/actions/mo-actions";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  getColaboradorSaldo,
  listLancamentos,
} from "@/services/pagamento-mo-service";

const TIPO_LABELS: Record<string, string> = {
  solicitacao: "Solicitação",
  vale: "Vale",
  reembolso: "Reembolso",
};

const STATUS_FILTRO_LABELS: Record<string, string> = {
  pendente: "Pendentes",
  confirmado: "Confirmados",
};

export default async function PagamentoMoPage({
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

  const canConfirm = hasPermission(
    currentProfile.role,
    permissions,
    "pagamento_mo.confirm",
  );
  const params = await searchParams;
  const status =
    params.status === "pendente" || params.status === "confirmado"
      ? params.status
      : undefined;
  const [lancamentos, saldos] = await Promise.all([
    listLancamentos({ status }),
    getColaboradorSaldo(),
  ]);

  const valesAbertos = lancamentos.filter(
    (lancamento: any) =>
      lancamento.tipo === "vale" &&
      lancamento.status === "confirmado" &&
      !lancamento.vale_aplicado_em,
  );
  const pagamentosPorColaborador: Record<
    string,
    Array<{ id: string; label: string }>
  > = {};
  for (const lancamento of lancamentos) {
    if (lancamento.tipo === "vale" || !lancamento.colaborador?.id) {
      continue;
    }
    pagamentosPorColaborador[lancamento.colaborador.id] ??= [];
    pagamentosPorColaborador[lancamento.colaborador.id].push({
      id: lancamento.id,
      label: `${TIPO_LABELS[lancamento.tipo] ?? lancamento.tipo} · ${new Date(lancamento.created_at).toLocaleDateString("pt-BR")}${
        lancamento.valor != null
          ? ` · R$ ${Number(lancamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : ""
      }`,
    });
  }

  const precisaCentroCusto = lancamentos.some(
    (lancamento: any) =>
      lancamento.status === "pendente" &&
      lancamento.tipo === "solicitacao" &&
      !lancamento.orcamento_item_id,
  );
  const orcamentoItensByObra: Record<
    string,
    Array<{ id: string; descricao: string }>
  > = {};

  if (canConfirm && precisaCentroCusto) {
    const supabase = await createClient();
    const { data: orcamentoItens } = await supabase
      .from("obra_orcamento_itens")
      .select("id,obra_id,descricao")
      .eq("tipo", "mao_de_obra")
      .order("descricao");

    for (const item of orcamentoItens ?? []) {
      orcamentoItensByObra[item.obra_id] ??= [];
      orcamentoItensByObra[item.obra_id].push({
        id: item.id,
        descricao: item.descricao,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pagamento MO
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lançamentos de mão de obra: solicitações, vales e reembolsos.
          </p>
          {status ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Filtrando por: {STATUS_FILTRO_LABELS[status]} ·{" "}
              <Link href="/pagamento-mo" className="underline">
                Ver todos
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/pagamento-mo/colaboradores">
              Colaboradores/Prestadores
            </Link>
          </Button>
          <Button asChild>
            <Link href="/pagamento-mo/novo">Novo lançamento</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo por colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador/Prestador</th>
                  <th className="px-3 py-2 text-left">Saldo confirmado</th>
                  <th className="px-3 py-2 text-left">Saldo pendente</th>
                </tr>
              </thead>
              <tbody>
                {saldos.map((saldo: any) => (
                  <tr key={saldo.colaborador_id} className="border-t">
                    <td className="px-3 py-2">{saldo.nome}</td>
                    <td className="px-3 py-2">
                      R${" "}
                      {Number(saldo.saldo_confirmado).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      {Number(saldo.saldo_pendente) !== 0 ? (
                        <Badge variant="warning">
                          R${" "}
                          {Number(saldo.saldo_pendente).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2 },
                          )}
                        </Badge>
                      ) : (
                        "R$ 0,00"
                      )}
                    </td>
                  </tr>
                ))}
                {saldos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="h-16 px-3 text-center text-muted-foreground"
                    >
                      Nenhum colaborador cadastrado.
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
          <CardTitle className="text-base">Vales em aberto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador/Prestador</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  {canConfirm ? (
                    <th className="px-3 py-2 text-left">Dar baixa</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {valesAbertos.map((vale: any) => {
                  const opcoes =
                    pagamentosPorColaborador[vale.colaborador?.id] ?? [];

                  return (
                    <tr key={vale.id} className="border-t">
                      <td className="px-3 py-2">{vale.colaborador?.nome}</td>
                      <td className="px-3 py-2">
                        R${" "}
                        {Number(vale.valor).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2">
                        {new Date(vale.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      {canConfirm ? (
                        <td className="px-3 py-2">
                          {opcoes.length > 0 ? (
                            <form
                              action={darBaixaVale}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input type="hidden" name="id" value={vale.id} />
                              <select
                                name="pagamento_id"
                                required
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                              >
                                <option value="">Vincular a pagamento</option>
                                {opcoes.map((opcao) => (
                                  <option key={opcao.id} value={opcao.id}>
                                    {opcao.label}
                                  </option>
                                ))}
                              </select>
                              <Button type="submit" size="sm" variant="outline">
                                Dar baixa
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sem pagamento deste colaborador pra vincular ainda
                            </span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                {valesAbertos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canConfirm ? 4 : 3}
                      className="h-16 px-3 text-center text-muted-foreground"
                    >
                      Nenhum vale em aberto.
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
          <CardTitle className="text-base">Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador/Prestador</th>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  {canConfirm ? (
                    <th className="px-3 py-2 text-left">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((lancamento: any) => (
                  <tr key={lancamento.id} className="border-t">
                    <td className="px-3 py-2">
                      {lancamento.colaborador?.nome}
                    </td>
                    <td className="px-3 py-2">{lancamento.obra?.nome}</td>
                    <td className="px-3 py-2">
                      {TIPO_LABELS[lancamento.tipo] ?? lancamento.tipo}
                    </td>
                    <td className="px-3 py-2">
                      {lancamento.valor == null ? (
                        <Badge variant="warning">
                          Aguardando valor ({lancamento.qtd_diarias}{" "}
                          {Number(lancamento.qtd_diarias) === 1
                            ? "diária"
                            : "diárias"}
                          )
                        </Badge>
                      ) : (
                        `R$ ${Number(lancamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          lancamento.status === "confirmado"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {lancamento.status === "confirmado"
                          ? "Confirmado"
                          : "Pendente"}
                      </Badge>
                      {lancamento.tipo === "vale" &&
                      lancamento.status === "confirmado" ? (
                        <div className="mt-1">
                          <Badge
                            variant={
                              lancamento.vale_aplicado_em
                                ? "default"
                                : "warning"
                            }
                          >
                            {lancamento.vale_aplicado_em
                              ? "Baixado"
                              : "Em aberto"}
                          </Badge>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(lancamento.created_at).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    {canConfirm ? (
                      <td className="px-3 py-2">
                        {lancamento.status === "pendente" ? (
                          <form
                            action={confirmarLancamento}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={lancamento.id}
                            />
                            {lancamento.valor == null ? (
                              <Input
                                name="valor_diaria"
                                inputMode="decimal"
                                placeholder="Valor da diária"
                                required
                                className="h-9 w-32"
                              />
                            ) : null}
                            {lancamento.tipo === "solicitacao" &&
                            !lancamento.orcamento_item_id ? (
                              <select
                                name="orcamento_item_id"
                                required
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                              >
                                <option value="">Centro de custo</option>
                                {(
                                  orcamentoItensByObra[lancamento.obra?.id] ??
                                  []
                                ).map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.descricao}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <Button type="submit" size="sm" variant="outline">
                              Confirmar pagamento
                            </Button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
                {lancamentos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canConfirm ? 7 : 6}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhum lançamento registrado.
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
