import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createOrcamentoItem,
  deleteOrcamentoItem,
  updateObraFase,
  updateObraGestor,
} from "@/features/obras/actions/obra-actions";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { FASE_LABELS } from "@/lib/obras-constants";
import {
  getObraDetail,
  getObraGestor,
  getOrcamentoRealizado,
  listGestoresDisponiveis,
} from "@/services/obras-service";
import { getCurrentProfile } from "@/services/profiles-service";

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

  const [permissions, obra, orcamento, obraGestor] = await Promise.all([
    getPermissionsForUser(currentProfile.id),
    getObraDetail(id),
    getOrcamentoRealizado(id),
    getObraGestor(id),
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

  const insumosItens = orcamento.filter((item: any) => item.tipo === "insumos");
  const moItens = orcamento.filter((item: any) => item.tipo === "mao_de_obra");

  function totals(itens: any[]) {
    return {
      orcado: itens.reduce(
        (sum: number, item: any) => sum + Number(item.valor_orcado ?? 0),
        0,
      ),
      realizado: itens.reduce(
        (sum: number, item: any) =>
          sum +
          Number(item.material_realizado ?? 0) +
          Number(item.mo_realizado ?? 0),
        0,
      ),
    };
  }

  const insumosTotals = totals(insumosItens);
  const moTotals = totals(moItens);

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
                <span className="text-muted-foreground">Código:</span>{" "}
                {obra.codigo ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Telefone de contato:
                </span>{" "}
                {obra.telefone_responsavel ?? "-"}
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
            </div>
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
                <Button asChild>
                  <a
                    href={`/api/obras/${obra.id}/relatorio`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Gerar PDF
                  </a>
                </Button>
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
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
                {(
                  Number(item.material_realizado) + Number(item.mo_realizado)
                ).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </td>
              {canEditOrcamento ? (
                <td className="px-3 py-2">
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
  );
}
