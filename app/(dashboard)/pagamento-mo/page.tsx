import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MobileCard,
  MobileCardActions,
  MobileCardEmpty,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
import {
  confirmarLancamento,
  darBaixaVale,
} from "@/features/pagamento-mo/actions/mo-actions";
import {
  hasPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";
import { listLancamentos } from "@/services/pagamento-mo-service";

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
  const isGestor = isGestorRole(currentProfile.role);
  const params = await searchParams;
  // Sem filtro explícito na URL, arquiva os pagamentos já confirmados —
  // eles ficam acessíveis por "Pagos" (agrupado por prestador) em vez de
  // aparecerem sempre misturados na lista principal. Gestor não tem essa
  // opção — só acompanha o que está pendente, já pago não é assunto dele.
  const status = isGestor
    ? "pendente"
    : params.status === "pendente" || params.status === "confirmado"
      ? params.status
      : "pendente";
  // Vales em aberto e o vínculo de baixa dependem de pagamentos já
  // confirmados, então essas duas contas usam sempre a lista completa
  // (sem o filtro de status acima), não só o que está sendo exibido.
  const [lancamentos, todosLancamentos] = await Promise.all([
    listLancamentos({ status }),
    listLancamentos({}),
  ]);

  const valesAbertos = todosLancamentos.filter(
    (lancamento: any) =>
      lancamento.tipo === "vale" &&
      lancamento.status === "confirmado" &&
      !lancamento.vale_aplicado_em,
  );
  const pagamentosPorColaborador: Record<
    string,
    Array<{ id: string; label: string }>
  > = {};
  for (const lancamento of todosLancamentos) {
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

  const precisaCentroCusto = todosLancamentos.some(
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

  function DarBaixaVale({ vale }: { vale: any }) {
    const opcoes = pagamentosPorColaborador[vale.colaborador?.id] ?? [];

    if (opcoes.length === 0) {
      return (
        <span className="text-xs text-muted-foreground">
          Sem pagamento deste colaborador pra vincular ainda
        </span>
      );
    }

    return (
      <form action={darBaixaVale} className="flex flex-wrap items-center gap-2">
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
    );
  }

  function AcaoLancamento({ lancamento }: { lancamento: any }) {
    if (lancamento.status !== "pendente") return null;

    return (
      <form
        action={confirmarLancamento}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="id" value={lancamento.id} />
        {lancamento.valor == null ? (
          <Input
            name="valor_diaria"
            inputMode="decimal"
            placeholder="Valor da diária"
            required
            className="h-9 w-32"
          />
        ) : (
          <Input
            name="valor"
            inputMode="decimal"
            defaultValue={String(lancamento.valor)}
            title="Valor a liberar — pode ser diferente do solicitado"
            className="h-9 w-28"
          />
        )}
        {lancamento.tipo === "solicitacao" && !lancamento.orcamento_item_id ? (
          <select
            name="orcamento_item_id"
            required
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Centro de custo</option>
            {(orcamentoItensByObra[lancamento.obra?.id] ?? []).map((item) => (
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
    );
  }

  function pixOuConta(lancamento: any) {
    return (
      lancamento.colaborador?.chave_pix ||
      lancamento.colaborador?.dados_bancarios ||
      "-"
    );
  }

  function StatusLancamento({ lancamento }: { lancamento: any }) {
    return (
      <>
        <Badge
          variant={lancamento.status === "confirmado" ? "default" : "secondary"}
        >
          {lancamento.status === "confirmado" ? "Confirmado" : "Pendente"}
        </Badge>
        {lancamento.tipo === "vale" && lancamento.status === "confirmado" ? (
          <div className="mt-1">
            <Badge
              variant={lancamento.vale_aplicado_em ? "default" : "warning"}
            >
              {lancamento.vale_aplicado_em ? "Baixado" : "Em aberto"}
            </Badge>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pagamento MO
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitações de pagamento de mão de obra: solicitações, vales e
            reembolsos.
          </p>
          {!isGestor ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {params.status
                ? `Filtrando por: ${STATUS_FILTRO_LABELS[status]}`
                : "Mostrando pendentes — pagos ficam em"}{" "}
              {params.status ? (
                <>
                  {" · "}
                  <Link href="/pagamento-mo" className="underline">
                    Ver todos
                  </Link>
                </>
              ) : (
                <Link href="/pagamento-mo/pagos" className="underline">
                  Pagos
                </Link>
              )}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isGestor ? (
            <Button asChild variant="outline">
              <Link href="/pagamento-mo/pagos">Pagos</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/pagamento-mo/colaboradores">
              Colaboradores/Prestadores
            </Link>
          </Button>
          <Button asChild>
            <Link href="/pagamento-mo/novo">Nova solicitação de pagamento</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vales em aberto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
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
                {valesAbertos.map((vale: any) => (
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
                        <DarBaixaVale vale={vale} />
                      </td>
                    ) : null}
                  </tr>
                ))}
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

          {valesAbertos.length === 0 ? (
            <MobileCardEmpty>Nenhum vale em aberto.</MobileCardEmpty>
          ) : (
            <MobileCardList>
              {valesAbertos.map((vale: any) => (
                <MobileCard key={vale.id}>
                  <MobileCardRow label="Colaborador/Prestador">
                    {vale.colaborador?.nome}
                  </MobileCardRow>
                  <MobileCardRow label="Valor">
                    R${" "}
                    {Number(vale.valor).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </MobileCardRow>
                  <MobileCardRow label="Data">
                    {new Date(vale.created_at).toLocaleDateString("pt-BR")}
                  </MobileCardRow>
                  {canConfirm ? (
                    <MobileCardActions>
                      <DarBaixaVale vale={vale} />
                    </MobileCardActions>
                  ) : null}
                </MobileCard>
              ))}
            </MobileCardList>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitação de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador/Prestador</th>
                  <th className="px-3 py-2 text-left">Pix / Conta</th>
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
                    <td className="px-3 py-2">{pixOuConta(lancamento)}</td>
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
                        <AcaoLancamento lancamento={lancamento} />
                      </td>
                    ) : null}
                  </tr>
                ))}
                {lancamentos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canConfirm ? 8 : 7}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma solicitação de pagamento{" "}
                      {status === "confirmado" ? "confirmada" : "pendente"}.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {lancamentos.length === 0 ? (
            <MobileCardEmpty>Nenhum lançamento registrado.</MobileCardEmpty>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
              {lancamentos.map((lancamento: any) => (
                <div
                  key={lancamento.id}
                  className="space-y-1 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {lancamento.colaborador?.nome}
                    </span>
                    <span className="font-medium">
                      {lancamento.valor == null ? (
                        <Badge variant="warning">Aguardando valor</Badge>
                      ) : (
                        `R$ ${Number(lancamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {TIPO_LABELS[lancamento.tipo] ?? lancamento.tipo} ·{" "}
                      {lancamento.obra?.nome} · {pixOuConta(lancamento)}
                    </span>
                    <span>
                      {new Date(lancamento.created_at).toLocaleDateString(
                        "pt-BR",
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <StatusLancamento lancamento={lancamento} />
                    {canConfirm && lancamento.status === "pendente" ? (
                      <AcaoLancamento lancamento={lancamento} />
                    ) : null}
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
