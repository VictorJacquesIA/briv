import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MobileCard,
  MobileCardActions,
  MobileCardEmpty,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createDespesaManual,
  createOrcamentoItem,
  deleteDespesaManual,
  deleteOrcamentoItem,
  updateObraFase,
  updateObraGestor,
} from "@/features/obras/actions/obra-actions";
import { GerarRelatorioButton } from "@/features/obras/components/gerar-relatorio-button";
import {
  hasPermission,
  getPermissionsForUser,
  canAccessObra,
  getLinkedObrasForUser,
} from "@/lib/permissions";
import { FASE_LABELS, ORCAMENTO_TIPO_LABELS } from "@/lib/obras-constants";
import {
  listSolicitacoes,
  statusGroupKey,
  statusGroupLabel,
} from "@/services/compras-service";
import { listFerramentaSolicitacoes } from "@/services/ferramentas-service";
import {
  getObraDetail,
  getObraGestor,
  getOrcamentoRealizado,
  listDespesasManuais,
  listGestoresDisponiveis,
} from "@/services/obras-service";
import {
  listContratos,
  listLancamentos,
} from "@/services/pagamento-mo-service";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  listCacambas,
  listDesmobilizacoes,
} from "@/services/servicos-obra-service";

const LANCAMENTO_TIPO_LABELS: Record<string, string> = {
  solicitacao: "Solicitação",
  vale: "Vale",
  reembolso: "Reembolso",
};

const FERRAMENTA_DECISAO_LABELS: Record<string, string> = {
  deposito: "Depósito",
  locacao: "Locação",
};

export default async function ObraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "obras.view")) {
    redirect("/dashboard");
  }

  const linkedObras = await getLinkedObrasForUser(currentProfile.id);

  if (
    !(await canAccessObra(currentProfile.role, permissions, id, linkedObras))
  ) {
    redirect("/obras");
  }

  const [obra, orcamento, obraGestor, despesasManuais] = await Promise.all([
    getObraDetail(id),
    getOrcamentoRealizado(id),
    getObraGestor(id),
    listDespesasManuais(id),
  ]);

  const canManageObra = hasPermission(
    currentProfile.role,
    permissions,
    "obras.edit",
  );
  const gestores = canManageObra
    ? await listGestoresDisponiveis(obra.cliente_id)
    : [];
  const canEditOrcamento = hasPermission(
    currentProfile.role,
    permissions,
    "obras.orcamento.edit",
  );
  const canViewOrcamento = hasPermission(
    currentProfile.role,
    permissions,
    "obras.orcamento.view",
  );

  // Hub da obra: cada aba nova só busca dado (e só aparece) se o usuário
  // tiver a permissão daquele módulo — mesmo padrão do canViewOrcamento
  // acima, só que reaproveitando as permissões que já existem em cada
  // módulo em vez de criar uma nova só pra essa tela.
  const canViewCompras = hasPermission(
    currentProfile.role,
    permissions,
    "solicitacoes.view",
  );
  const canViewPagamentos = hasPermission(
    currentProfile.role,
    permissions,
    "pagamento_mo.view",
  );
  const canViewCacamba = hasPermission(
    currentProfile.role,
    permissions,
    "cacamba.view",
  );
  const canViewDesmobilizacao = hasPermission(
    currentProfile.role,
    permissions,
    "desmobilizacao.view",
  );
  const canViewFerramentas = hasPermission(
    currentProfile.role,
    permissions,
    "ferramentas.solicitacao.view",
  );
  const canViewServicos =
    canViewCacamba || canViewDesmobilizacao || canViewFerramentas;

  const [
    solicitacoesCompra,
    lancamentosMo,
    contratosMo,
    cacambas,
    desmobilizacoes,
    ferramentaSolicitacoes,
  ] = await Promise.all([
    canViewCompras ? listSolicitacoes({ obraId: id }) : null,
    canViewPagamentos ? listLancamentos({ obraId: id }) : [],
    canViewPagamentos ? listContratos({ obraId: id }) : [],
    canViewCacamba ? listCacambas({ obraId: id }) : [],
    canViewDesmobilizacao ? listDesmobilizacoes({ obraId: id }) : [],
    canViewFerramentas ? listFerramentaSolicitacoes({ obraIds: [id] }) : [],
  ]);

  const insumosItens = orcamento.filter((item: any) => item.tipo === "insumos");
  const moItens = orcamento.filter((item: any) => item.tipo === "mao_de_obra");
  const extraItens = orcamento.filter((item: any) => item.tipo === "extra");

  function realizadoDoItem(item: any) {
    return (
      Number(item.material_realizado ?? 0) +
      Number(item.mo_realizado ?? 0) +
      Number(item.servicos_realizado ?? 0) +
      Number(item.despesas_realizado ?? 0)
    );
  }

  function totals(itens: any[]) {
    return {
      orcado: itens.reduce(
        (sum: number, item: any) => sum + Number(item.valor_orcado ?? 0),
        0,
      ),
      realizado: itens.reduce(
        (sum: number, item: any) => sum + realizadoDoItem(item),
        0,
      ),
    };
  }

  const insumosTotals = totals(insumosItens);
  const moTotals = totals(moItens);
  const extraTotals = totals(extraItens);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{obra.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {FASE_LABELS[obra.fase] ?? obra.fase} ·{" "}
            {obra.cliente?.nome_fantasia ?? obra.cliente?.razao_social}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/obras">Voltar</Link>
        </Button>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          {canViewOrcamento ? (
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
          ) : null}
          {canViewCompras ? (
            <TabsTrigger value="compras">Compras</TabsTrigger>
          ) : null}
          {canViewPagamentos ? (
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          ) : null}
          {canViewServicos ? (
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
          ) : null}
          {canViewOrcamento ? (
            <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da obra</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Fase:</span>{" "}
                {canManageObra ? (
                  <form
                    action={updateObraFase}
                    className="mt-1 flex items-center gap-2"
                  >
                    <input type="hidden" name="obra_id" value={obra.id} />
                    <select
                      key={obra.fase}
                      name="fase"
                      defaultValue={obra.fase}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {Object.entries(FASE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Salvar
                    </Button>
                  </form>
                ) : (
                  (FASE_LABELS[obra.fase] ?? obra.fase)
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Gestor de obra:</span>{" "}
                {canManageObra ? (
                  <form
                    action={updateObraGestor}
                    className="mt-1 flex items-center gap-2"
                  >
                    <input type="hidden" name="obra_id" value={obra.id} />
                    <select
                      key={obraGestor?.user_id ?? "sem-gestor"}
                      name="gestor_id"
                      defaultValue={obraGestor?.user_id ?? ""}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">Sem gestor</option>
                      {gestores.map((gestor: any) => (
                        <option key={gestor.id} value={gestor.id}>
                          {gestor.nome}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Salvar
                    </Button>
                  </form>
                ) : (
                  (obraGestor?.profile?.nome ?? "-")
                )}
              </div>
              <p>
                <span className="text-muted-foreground">
                  Nome/Razão social:
                </span>{" "}
                {obra.contratante_nome ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">CPF/CNPJ:</span>{" "}
                {obra.contratante_documento ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">E-mail:</span>{" "}
                {obra.contratante_email ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Telefone de contato:
                </span>{" "}
                {obra.telefone_responsavel ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Código:</span>{" "}
                {obra.codigo ?? "-"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Endereço:</span>{" "}
                {obra.endereco ?? "-"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewOrcamento ? (
          <TabsContent value="orcamento">
            <div className="space-y-4">
              {canEditOrcamento ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Adicionar item de orçamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      action={createOrcamentoItem}
                      className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
                    >
                      <input type="hidden" name="obra_id" value={obra.id} />
                      <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input id="descricao" name="descricao" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo</Label>
                        <select
                          id="tipo"
                          name="tipo"
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          required
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Selecione
                          </option>
                          <option value="insumos">Insumos</option>
                          <option value="mao_de_obra">Mão de Obra</option>
                          <option value="extra">Extra</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoria</Label>
                        <Input id="categoria" name="categoria" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valor_orcado">Valor orçado</Label>
                        <Input
                          id="valor_orcado"
                          name="valor_orcado"
                          inputMode="decimal"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full">
                          Adicionar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Despesas manuais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Lance um gasto diretamente contra um centro de custo
                    existente, sem passar por Compras ou Serviços. O valor entra
                    imediatamente no Realizado do item selecionado.
                  </p>

                  {canEditOrcamento ? (
                    <form
                      action={createDespesaManual}
                      className="grid gap-3 lg:grid-cols-[1.3fr_1.3fr_0.9fr_0.9fr_auto]"
                    >
                      <input type="hidden" name="obra_id" value={obra.id} />
                      <div className="space-y-2">
                        <Label htmlFor="orcamento_item_id">
                          Centro de custo
                        </Label>
                        <select
                          id="orcamento_item_id"
                          name="orcamento_item_id"
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          required
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Selecione
                          </option>
                          <optgroup label="Insumos">
                            {insumosItens.map((item: any) => (
                              <option
                                key={item.orcamento_item_id}
                                value={item.orcamento_item_id}
                              >
                                {item.descricao}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Mão de Obra">
                            {moItens.map((item: any) => (
                              <option
                                key={item.orcamento_item_id}
                                value={item.orcamento_item_id}
                              >
                                {item.descricao}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Extra">
                            {extraItens.map((item: any) => (
                              <option
                                key={item.orcamento_item_id}
                                value={item.orcamento_item_id}
                              >
                                {item.descricao}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="despesa_descricao">
                          Descrição / motivo
                        </Label>
                        <Input
                          id="despesa_descricao"
                          name="descricao"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="data_despesa">Data</Label>
                        <Input
                          id="data_despesa"
                          name="data_despesa"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="despesa_valor">Valor</Label>
                        <Input
                          id="despesa_valor"
                          name="valor"
                          inputMode="decimal"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full">
                          Lançar
                        </Button>
                      </div>
                    </form>
                  ) : null}

                  <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-3 py-2 text-left">Data</th>
                          <th className="px-3 py-2 text-left">
                            Centro de custo
                          </th>
                          <th className="px-3 py-2 text-left">Descrição</th>
                          <th className="px-3 py-2 text-left">Valor</th>
                          <th className="px-3 py-2 text-left">Lançado por</th>
                          {canEditOrcamento ? (
                            <th className="px-3 py-2 text-left">Ações</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {despesasManuais.map((despesa: any) => (
                          <tr key={despesa.id} className="border-t">
                            <td className="px-3 py-2">
                              {new Date(
                                `${despesa.data_despesa}T00:00:00`,
                              ).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">
                                {despesa.orcamento_item?.descricao ?? "-"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {despesa.orcamento_item?.tipo
                                  ? ORCAMENTO_TIPO_LABELS[
                                      despesa.orcamento_item.tipo
                                    ]
                                  : "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2">{despesa.descricao}</td>
                            <td className="px-3 py-2">
                              R${" "}
                              {Number(despesa.valor).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2">
                              {despesa.profile?.nome ?? "-"}
                            </td>
                            {canEditOrcamento ? (
                              <td className="px-3 py-2">
                                <form action={deleteDespesaManual}>
                                  <input
                                    type="hidden"
                                    name="obra_id"
                                    value={obra.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="despesa_id"
                                    value={despesa.id}
                                  />
                                  <ConfirmSubmitButton
                                    type="submit"
                                    variant="destructive"
                                    size="sm"
                                    message="Remover esta despesa manual?"
                                  >
                                    Remover
                                  </ConfirmSubmitButton>
                                </form>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                        {despesasManuais.length === 0 ? (
                          <tr>
                            <td
                              colSpan={canEditOrcamento ? 6 : 5}
                              className="h-20 px-3 text-center text-muted-foreground"
                            >
                              Nenhuma despesa manual lançada.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {despesasManuais.length === 0 ? (
                    <MobileCardEmpty>
                      Nenhuma despesa manual lançada.
                    </MobileCardEmpty>
                  ) : (
                    <MobileCardList>
                      {despesasManuais.map((despesa: any) => (
                        <MobileCard key={despesa.id}>
                          <MobileCardRow label="Data">
                            {new Date(
                              `${despesa.data_despesa}T00:00:00`,
                            ).toLocaleDateString("pt-BR")}
                          </MobileCardRow>
                          <MobileCardRow label="Centro de custo">
                            <div>
                              {despesa.orcamento_item?.descricao ?? "-"}
                              <div className="text-xs font-normal text-muted-foreground">
                                {despesa.orcamento_item?.tipo
                                  ? ORCAMENTO_TIPO_LABELS[
                                      despesa.orcamento_item.tipo
                                    ]
                                  : "-"}
                              </div>
                            </div>
                          </MobileCardRow>
                          <MobileCardRow label="Descrição">
                            {despesa.descricao}
                          </MobileCardRow>
                          <MobileCardRow label="Valor">
                            R${" "}
                            {Number(despesa.valor).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </MobileCardRow>
                          <MobileCardRow label="Lançado por">
                            {despesa.profile?.nome ?? "-"}
                          </MobileCardRow>
                          {canEditOrcamento ? (
                            <MobileCardActions>
                              <form action={deleteDespesaManual}>
                                <input
                                  type="hidden"
                                  name="obra_id"
                                  value={obra.id}
                                />
                                <input
                                  type="hidden"
                                  name="despesa_id"
                                  value={despesa.id}
                                />
                                <ConfirmSubmitButton
                                  type="submit"
                                  variant="destructive"
                                  size="sm"
                                  message="Remover esta despesa manual?"
                                >
                                  Remover
                                </ConfirmSubmitButton>
                              </form>
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
                  <CardTitle className="text-base">
                    Insumos — Orçado x Realizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrcamentoTable
                    itens={insumosItens}
                    totals={insumosTotals}
                    obraId={obra.id}
                    canEditOrcamento={canEditOrcamento}
                    emptyMessage="Nenhum item de insumos cadastrado."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Mão de Obra — Orçado x Realizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrcamentoTable
                    itens={moItens}
                    totals={moTotals}
                    obraId={obra.id}
                    canEditOrcamento={canEditOrcamento}
                    emptyMessage="Nenhum item de mão de obra cadastrado."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Extra — Orçado x Realizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrcamentoTable
                    itens={extraItens}
                    totals={extraTotals}
                    obraId={obra.id}
                    canEditOrcamento={canEditOrcamento}
                    emptyMessage="Nenhum item extra cadastrado."
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ) : null}

        {canViewCompras ? (
          <TabsContent value="compras">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Solicitações de compra
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(solicitacoesCompra?.data ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma solicitação de compra pra esta obra.
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {(solicitacoesCompra?.data ?? []).map(
                      (solicitacao: any) => (
                        <Link
                          key={solicitacao.id}
                          href={`/compras/${solicitacao.id}`}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-secondary/40"
                        >
                          <div>
                            <div className="font-medium">
                              {solicitacao.codigo ?? solicitacao.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {solicitacao.fornecedor_aprovado?.nome_fantasia ??
                                solicitacao.fornecedor_aprovado?.razao_social ??
                                "Sem fornecedor definido"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs capitalize text-muted-foreground">
                              {solicitacao.prioridade}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                solicitacao.created_at,
                              ).toLocaleDateString("pt-BR")}
                            </span>
                            <StatusBadge
                              status={statusGroupKey(solicitacao.status)}
                              label={statusGroupLabel(solicitacao.status)}
                            />
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canViewPagamentos ? (
          <TabsContent value="pagamentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Solicitações de pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lancamentosMo.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma solicitação de pagamento pra esta obra.
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {lancamentosMo.map((lancamento: any) => (
                      <div
                        key={lancamento.id}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {lancamento.colaborador?.nome ?? "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {LANCAMENTO_TIPO_LABELS[lancamento.tipo] ??
                              lancamento.tipo}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {lancamento.valor == null
                              ? "Aguardando valor"
                              : `R$ ${Number(lancamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                          </span>
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Contratos (prestação de serviço)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contratosMo.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhum contrato de mão de obra pra esta obra.
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {contratosMo.map((contrato: any) => (
                      <div
                        key={contrato.contrato_id}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {contrato.colaborador_nome}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contrato.descricao}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            R${" "}
                            {Number(contrato.valor_total).toLocaleString(
                              "pt-BR",
                              { minimumFractionDigits: 2 },
                            )}{" "}
                            · saldo R${" "}
                            {Number(contrato.saldo_restante).toLocaleString(
                              "pt-BR",
                              { minimumFractionDigits: 2 },
                            )}
                          </span>
                          <Badge
                            variant={
                              contrato.status === "quitado"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {contrato.status === "quitado"
                              ? "Quitado"
                              : "Aberto"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canViewServicos ? (
          <TabsContent value="servicos" className="space-y-4">
            {canViewCacamba ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Caçambas de entulho
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cacambas.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhuma caçamba pra esta obra.
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border border-border bg-card">
                      {cacambas.map((cacamba: any) => (
                        <div
                          key={cacamba.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium capitalize">
                              {cacamba.tipo}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {cacamba.fornecedor?.nome_fantasia ??
                                cacamba.fornecedor?.razao_social ??
                                "Sem fornecedor"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {cacamba.valor != null ? (
                              <span className="text-xs text-muted-foreground">
                                R${" "}
                                {Number(cacamba.valor).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : null}
                            <Badge variant="secondary" className="capitalize">
                              {cacamba.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {canViewDesmobilizacao ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Desmobilização</CardTitle>
                </CardHeader>
                <CardContent>
                  {desmobilizacoes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhuma desmobilização pra esta obra.
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border border-border bg-card">
                      {desmobilizacoes.map((desmobilizacao: any) => (
                        <div
                          key={desmobilizacao.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">
                              {new Date(
                                `${desmobilizacao.data_desmobilizacao}T00:00:00`,
                              ).toLocaleDateString("pt-BR")}
                            </div>
                            {desmobilizacao.observacao ? (
                              <div className="text-xs text-muted-foreground">
                                {desmobilizacao.observacao}
                              </div>
                            ) : null}
                          </div>
                          <Badge
                            variant={
                              desmobilizacao.status === "concluida"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {desmobilizacao.status === "concluida"
                              ? "Concluída"
                              : "Pendente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {canViewFerramentas ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ferramentas</CardTitle>
                </CardHeader>
                <CardContent>
                  {ferramentaSolicitacoes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhuma solicitação de ferramenta pra esta obra.
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border border-border bg-card">
                      {ferramentaSolicitacoes.map((solicitacao: any) => (
                        <div
                          key={solicitacao.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">
                              {solicitacao.descricao}
                            </div>
                            {solicitacao.decisao ? (
                              <div className="text-xs text-muted-foreground">
                                {FERRAMENTA_DECISAO_LABELS[
                                  solicitacao.decisao
                                ] ?? solicitacao.decisao}
                                {solicitacao.decisao === "locacao" &&
                                solicitacao.ferramenta?.fornecedor
                                  ? ` · ${
                                      solicitacao.ferramenta.fornecedor
                                        .nome_fantasia ??
                                      solicitacao.ferramenta.fornecedor
                                        .razao_social
                                    }`
                                  : ""}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3">
                            {solicitacao.ferramenta?.valor_locacao != null ? (
                              <span className="text-xs text-muted-foreground">
                                R${" "}
                                {Number(
                                  solicitacao.ferramenta.valor_locacao,
                                ).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : null}
                            <Badge
                              variant={
                                solicitacao.status === "atendida"
                                  ? "default"
                                  : solicitacao.status === "cancelada"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {solicitacao.status === "atendida"
                                ? "Atendida"
                                : solicitacao.status === "cancelada"
                                  ? "Cancelada"
                                  : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        ) : null}

        {canViewOrcamento ? (
          <TabsContent value="relatorio">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Relatório orçado x realizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GerarRelatorioButton obraId={obra.id} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function OrcamentoTable({
  itens,
  totals,
  obraId,
  canEditOrcamento,
  emptyMessage,
}: {
  itens: any[];
  totals: { orcado: number; realizado: number };
  obraId: string;
  canEditOrcamento: boolean;
  emptyMessage: string;
}) {
  function realizadoDoItem(item: any) {
    return (
      Number(item.material_realizado ?? 0) +
      Number(item.mo_realizado ?? 0) +
      Number(item.servicos_realizado ?? 0) +
      Number(item.despesas_realizado ?? 0)
    );
  }

  function AcoesOrcamentoItem({ item }: { item: any }) {
    return (
      <form action={deleteOrcamentoItem}>
        <input type="hidden" name="obra_id" value={obraId} />
        <input
          type="hidden"
          name="orcamento_item_id"
          value={item.orcamento_item_id}
        />
        <ConfirmSubmitButton
          type="submit"
          variant="destructive"
          size="sm"
          message="Remover este item de orçamento?"
        >
          Remover
        </ConfirmSubmitButton>
      </form>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Orçado</th>
              <th className="px-3 py-2 text-left">Realizado</th>
              {canEditOrcamento ? (
                <th className="px-3 py-2 text-left">Ações</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {itens.map((item: any) => (
              <tr key={item.orcamento_item_id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.categoria ?? "-"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  R${" "}
                  {Number(item.valor_orcado).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-3 py-2">
                  R${" "}
                  {realizadoDoItem(item).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                {canEditOrcamento ? (
                  <td className="px-3 py-2">
                    <AcoesOrcamentoItem item={item} />
                  </td>
                ) : null}
              </tr>
            ))}
            {itens.length === 0 ? (
              <tr>
                <td
                  colSpan={canEditOrcamento ? 4 : 3}
                  className="h-20 px-3 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
          {itens.length > 0 ? (
            <tfoot>
              <tr className="border-t font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2">
                  R${" "}
                  {totals.orcado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-3 py-2" colSpan={canEditOrcamento ? 2 : 1}>
                  R${" "}
                  {totals.realizado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {itens.length === 0 ? (
        <MobileCardEmpty>{emptyMessage}</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {itens.map((item: any) => (
            <MobileCard key={item.orcamento_item_id}>
              <MobileCardRow label="Item">
                <div>
                  {item.descricao}
                  <div className="text-xs font-normal text-muted-foreground">
                    {item.categoria ?? "-"}
                  </div>
                </div>
              </MobileCardRow>
              <MobileCardRow label="Orçado">
                R${" "}
                {Number(item.valor_orcado).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </MobileCardRow>
              <MobileCardRow label="Realizado">
                R${" "}
                {realizadoDoItem(item).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </MobileCardRow>
              {canEditOrcamento ? (
                <MobileCardActions>
                  <AcoesOrcamentoItem item={item} />
                </MobileCardActions>
              ) : null}
            </MobileCard>
          ))}
          <MobileCard className="font-medium">
            <MobileCardRow label="Total orçado">
              R${" "}
              {totals.orcado.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </MobileCardRow>
            <MobileCardRow label="Total realizado">
              R${" "}
              {totals.realizado.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </MobileCardRow>
          </MobileCard>
        </MobileCardList>
      )}
    </>
  );
}
