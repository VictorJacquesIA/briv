import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  avancarFluxo,
  iniciarCotacao,
} from "@/features/compras/actions/purchase-actions";
import { ApprovalForm } from "@/features/compras/components/approval-form";
import { Comparativo } from "@/features/compras/components/comparativo";
import { ConfirmarRecebimentoForm } from "@/features/compras/components/confirmar-recebimento-form";
import { CotacaoForm } from "@/features/compras/components/cotacao-form";
import { CotacaoRequestForm } from "@/features/compras/components/cotacao-request-form";
import { CotacaoReviewForm } from "@/features/compras/components/cotacao-review-form";
import { CotacaoUploadForm } from "@/features/compras/components/cotacao-upload-form";
import { EditarSolicitacaoForm } from "@/features/compras/components/editar-solicitacao-form";
import { EstoqueDecisionForm } from "@/features/compras/components/estoque-decision-form";
import { ProgramarPedidoForm } from "@/features/compras/components/programar-pedido-form";
import { WhatsAppButton } from "@/features/compras/components/whatsapp-button";
import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import {
  getPurchaseFormOptions,
  getSolicitacaoDetail,
  statusLabels,
  STATUSES_AGUARDANDO_COTACAO,
  STATUSES_EM_COTACAO,
  STATUSES_TERMINAIS,
} from "@/services/compras-service";
import { getEstoqueDisponivelPorItem } from "@/services/estoque-service";
import { pedidoMessage, waLink } from "@/services/whatsapp-service";

export default async function CompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "solicitacoes.view")) {
    redirect("/dashboard");
  }

  // Gestor de obra só solicita, acompanha o status e pode cancelar — não
  // participa do processo de cotação/pedido (isso já é bloqueado no servidor
  // por cotacoes.view/create/edit/validate, aqui só espelhamos na tela).
  const canViewProcesso = hasPermission(
    currentProfile.role,
    permissions,
    "cotacoes.view",
  );

  const { id } = await params;
  const [solicitacao, options] = await Promise.all([
    getSolicitacaoDetail(id),
    getPurchaseFormOptions(),
  ]);
  const approvalUrl = solicitacao.aprovacao_token
    ? `/aprovacao/${solicitacao.aprovacao_token}`
    : null;
  const pedidos = solicitacao.pedidos ?? [];
  // Uma solicitação dividida entre fornecedores (aprovação por rodadas) gera
  // um pedido por fornecedor — todos compartilham o mesmo local_entrega
  // (programarPedido aplica pra solicitação inteira), então esses dois
  // campos podem ser lidos de qualquer um deles.
  const pedido = pedidos[0];
  // Basta existir pelo menos 1 orçamento — não importa se foi cadastrado
  // manualmente ou por foto/PDF (a IA), nem se já foi validado: o botão
  // libera de qualquer forma, e enviarParaAprovacao (servidor) já recusa com
  // mensagem clara se alguma cotação ainda não foi validada ou se algum
  // item ficou sem cotação de nenhum fornecedor. Só não faz sentido depois
  // que o fluxo já passou do ponto de aprovação (fornecedor já escolhido).
  const podeEnviarAprovacao =
    (solicitacao.cotacoes ?? []).length > 0 &&
    ![
      "pdf_gerado",
      "pedido_programado",
      "pedido_enviado",
      "finalizada",
      "cancelada",
    ].includes(solicitacao.status);
  const ultimaRecusa =
    solicitacao.status === "rejeitada"
      ? [...(solicitacao.aprovacoes ?? [])]
          .filter((aprovacao: any) => aprovacao.status === "rejeitada")
          .sort(
            (a: any, b: any) =>
              new Date(b.decided_at).getTime() -
              new Date(a.decided_at).getTime(),
          )[0]
      : null;

  const precisaDecidirEstoque =
    STATUSES_AGUARDANDO_COTACAO.includes(solicitacao.status) &&
    !solicitacao.estoque_decidido_at;
  const itemIds = precisaDecidirEstoque
    ? (solicitacao.itens ?? [])
        .map((item: any) => item.item_id)
        .filter((itemId: string | null): itemId is string => Boolean(itemId))
    : [];
  const [disponibilidade, orcamentoItensResult] = precisaDecidirEstoque
    ? await (async () => {
        const supabase = await createClient();
        return Promise.all([
          getEstoqueDisponivelPorItem(itemIds),
          supabase
            .from("obra_orcamento_itens")
            .select("id,descricao")
            .eq("obra_id", solicitacao.obra_id)
            .eq("tipo", "insumos")
            .order("descricao"),
        ]);
      })()
    : [{}, { data: [] }];
  const orcamentoItens: Array<{ id: string; descricao: string }> =
    orcamentoItensResult.data ?? [];

  // Editável só em "Nova Solicitação" (antes de entrar em cotação): o
  // gestor que criou corrige a própria solicitação, compras/adm_geral pode
  // editar qualquer uma nessa etapa.
  const canEditSolicitacao =
    hasPermission(currentProfile.role, permissions, "solicitacoes.edit") &&
    STATUSES_AGUARDANDO_COTACAO.includes(solicitacao.status) &&
    (!isGestorRole(currentProfile.role) ||
      solicitacao.solicitante?.id === currentProfile.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {solicitacao.codigo ?? "Solicitação"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <StatusBadge
              status={solicitacao.status}
              label={statusLabels[solicitacao.status] ?? solicitacao.status}
            />
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/compras">Voltar</Link>
        </Button>
      </div>

      {canViewProcesso && ultimaRecusa ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-base">
              Solicitação recusada pelo gestor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Recusado por:</span>{" "}
              {ultimaRecusa.gestor_nome ?? "-"} em{" "}
              {ultimaRecusa.decided_at
                ? new Date(ultimaRecusa.decided_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                : "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Motivo:</span>{" "}
              {ultimaRecusa.comentario || "Nenhum motivo informado."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {solicitacao.divergencia_estoque_at ? (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="py-4 text-sm">
            <span className="font-medium">
              Divergência de estoque reportada pelo almoxarifado:
            </span>{" "}
            a quantidade separada foi menor do que a prometida. Ajuste
            manualmente a quantidade/orçamento na cotação, se necessário.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Cliente:</span>{" "}
              {solicitacao.cliente?.nome_fantasia ??
                solicitacao.cliente?.razao_social}
            </p>
            <p>
              <span className="text-muted-foreground">Obra:</span>{" "}
              {solicitacao.obra?.nome}
            </p>
            <p>
              <span className="text-muted-foreground">Responsável:</span>{" "}
              {solicitacao.responsavel_obra?.nome}
            </p>
            <p>
              <span className="text-muted-foreground">Prioridade:</span>{" "}
              {solicitacao.prioridade}
            </p>
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Observações:</span>{" "}
              {solicitacao.observacao ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canViewProcesso ? (
              <>
                {(solicitacao.status === "aberta" ||
                  solicitacao.status === "rascunho") &&
                !precisaDecidirEstoque ? (
                  <form action={iniciarCotacao}>
                    <input
                      type="hidden"
                      name="solicitacao_id"
                      value={solicitacao.id}
                    />
                    <Button type="submit" className="w-full">
                      Iniciar cotação
                    </Button>
                  </form>
                ) : null}
                {STATUSES_EM_COTACAO.includes(solicitacao.status) ? (
                  <CotacaoUploadForm
                    solicitacaoId={solicitacao.id}
                    fornecedores={options.fornecedores}
                    itens={solicitacao.itens ?? []}
                  />
                ) : null}
                {podeEnviarAprovacao ? (
                  <ApprovalForm
                    solicitacao={solicitacao}
                    approvalUrl={approvalUrl}
                  />
                ) : null}
                {approvalUrl ? (
                  <p className="break-all rounded-md border border-border bg-secondary p-3 text-xs text-muted-foreground">
                    Link público: {approvalUrl}
                  </p>
                ) : null}
                {pedidos.length > 1
                  ? pedidos.map((p: any) =>
                      p.pdf_url ? (
                        <div key={p.id} className="space-y-2">
                          <Button asChild variant="outline" className="w-full">
                            <a
                              href={p.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF —{" "}
                              {p.fornecedor?.nome_fantasia ??
                                p.fornecedor?.razao_social ??
                                p.numero}
                            </a>
                          </Button>
                          {(p.fornecedor?.whatsapp ??
                          p.fornecedor?.telefone) ? (
                            <WhatsAppButton
                              href={waLink(
                                p.fornecedor?.whatsapp ??
                                  p.fornecedor?.telefone,
                                pedidoMessage({
                                  numero: p.numero ?? "",
                                  obra: solicitacao.obra?.nome ?? "-",
                                  fornecedor:
                                    p.fornecedor?.nome_fantasia ??
                                    p.fornecedor?.razao_social ??
                                    "",
                                  pdfUrl: p.pdf_url,
                                }),
                              )}
                              tipo="pedido"
                              destinatario={
                                p.fornecedor?.nome_fantasia ??
                                p.fornecedor?.razao_social ??
                                ""
                              }
                              entidadeId={solicitacao.id}
                            >
                              Enviar pra{" "}
                              {p.fornecedor?.nome_fantasia ??
                                p.fornecedor?.razao_social}
                            </WhatsAppButton>
                          ) : null}
                        </div>
                      ) : null,
                    )
                  : pedido?.pdf_url && (
                      <div className="space-y-2">
                        <Button asChild variant="outline" className="w-full">
                          <a
                            href={pedido.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir PDF do pedido
                          </a>
                        </Button>
                        {(pedido.fornecedor?.whatsapp ??
                        pedido.fornecedor?.telefone) ? (
                          <WhatsAppButton
                            href={waLink(
                              pedido.fornecedor?.whatsapp ??
                                pedido.fornecedor?.telefone,
                              pedidoMessage({
                                numero: pedido.numero ?? "",
                                obra: solicitacao.obra?.nome ?? "-",
                                fornecedor:
                                  pedido.fornecedor?.nome_fantasia ??
                                  pedido.fornecedor?.razao_social ??
                                  "",
                                pdfUrl: pedido.pdf_url,
                              }),
                            )}
                            tipo="pedido"
                            destinatario={
                              pedido.fornecedor?.nome_fantasia ??
                              pedido.fornecedor?.razao_social ??
                              ""
                            }
                            entidadeId={solicitacao.id}
                          >
                            Enviar pra{" "}
                            {pedido.fornecedor?.nome_fantasia ??
                              pedido.fornecedor?.razao_social}
                          </WhatsAppButton>
                        ) : null}
                      </div>
                    )}
                {pedido?.local_entrega ? (
                  <p className="text-xs text-muted-foreground">
                    Entrega:{" "}
                    {pedido.local_entrega === "retirada"
                      ? `Retirada autorizada${pedido.retirada_autorizado_nome ? ` (${pedido.retirada_autorizado_nome})` : ""}`
                      : pedido.local_entrega === "deposito"
                        ? "Depósito"
                        : "Obra"}
                  </p>
                ) : null}
                {solicitacao.status === "pdf_gerado" ? (
                  <ProgramarPedidoForm id={solicitacao.id} />
                ) : null}
                {solicitacao.status === "pedido_programado" ? (
                  <FlowButton
                    id={solicitacao.id}
                    etapa="pedido_enviado"
                    label="Marcar pedido enviado"
                  />
                ) : null}
                {solicitacao.status === "pedido_enviado" ? (
                  <ConfirmarRecebimentoForm
                    id={solicitacao.id}
                    localEntrega={pedido?.local_entrega ?? null}
                    retiradaAutorizadoNome={pedido?.retirada_autorizado_nome}
                  />
                ) : null}
              </>
            ) : null}
            {!STATUSES_TERMINAIS.includes(solicitacao.status) ? (
              <FlowButton
                id={solicitacao.id}
                etapa="cancelada"
                label="Cancelar"
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canViewProcesso && precisaDecidirEstoque ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Organizar itens (estoque x cotação)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EstoqueDecisionForm
              solicitacaoId={solicitacao.id}
              itens={solicitacao.itens ?? []}
              disponibilidade={disponibilidade}
              orcamentoItens={orcamentoItens}
            />
          </CardContent>
        </Card>
      ) : null}

      {canEditSolicitacao ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar solicitação</CardTitle>
          </CardHeader>
          <CardContent>
            <EditarSolicitacaoForm
              solicitacaoId={solicitacao.id}
              prioridade={solicitacao.prioridade}
              observacao={solicitacao.observacao}
              dataNecessidade={solicitacao.data_necessidade}
              itens={solicitacao.itens ?? []}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Materiais</CardTitle>
        </CardHeader>
        <CardContent>
          {(solicitacao.itens ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum item nesta solicitação.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(solicitacao.itens ?? []).map((item: any) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm"
                >
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-muted-foreground">
                    Quantidade:{" "}
                    <span className="text-foreground">
                      {Number(item.quantidade).toLocaleString("pt-BR")}{" "}
                      {item.unidade}
                    </span>
                  </div>
                  {item.observacao ? (
                    <div className="text-muted-foreground">
                      Observação:{" "}
                      <span className="text-foreground">{item.observacao}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canViewProcesso ? (
        <>
          {(solicitacao.cotacoes ?? []).some(
            (cotacao: any) => cotacao.arquivo_path && !cotacao.validado_at,
          ) ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">
                Cotações recebidas aguardando validação
              </h2>
              {(solicitacao.cotacoes ?? [])
                .filter(
                  (cotacao: any) =>
                    cotacao.arquivo_path && !cotacao.validado_at,
                )
                .map((cotacao: any) => (
                  <CotacaoReviewForm
                    key={cotacao.id}
                    solicitacaoId={solicitacao.id}
                    cotacao={cotacao}
                    itens={(solicitacao.itens ?? []).filter((item: any) =>
                      (cotacao.itens ?? []).some(
                        (cotacaoItem: any) =>
                          cotacaoItem.solicitacao_item_id === item.id,
                      ),
                    )}
                  />
                ))}
            </div>
          ) : null}

          {!precisaDecidirEstoque ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pedir cotação a um fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CotacaoRequestForm
                    solicitacao={solicitacao}
                    fornecedores={options.fornecedores}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Cotações por fornecedor (manual)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CotacaoForm
                    solicitacao={solicitacao}
                    fornecedores={options.fornecedores}
                  />
                </CardContent>
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Comparativo lado a lado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Comparativo solicitacao={solicitacao} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {canViewProcesso ? (
        <Card>
          <CardContent className="py-4">
            <details>
              <summary className="inline-flex h-9 cursor-pointer select-none items-center rounded-md border px-3 text-sm hover:bg-secondary">
                Histórico
              </summary>
              <div className="mt-3 space-y-3">
                {(solicitacao.historico ?? []).map((entry: any) => (
                  <div key={entry.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{entry.acao}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FlowButton({
  id,
  etapa,
  label,
}: {
  id: string;
  etapa: string;
  label: string;
}) {
  return (
    <form action={avancarFluxo}>
      <input type="hidden" name="solicitacao_id" value={id} />
      <input type="hidden" name="etapa" value={etapa} />
      <ConfirmSubmitButton
        type="submit"
        variant={etapa === "cancelada" ? "destructive" : "default"}
        className="w-full"
        message={`Confirmar a etapa "${label}"?`}
      >
        {label}
      </ConfirmSubmitButton>
    </form>
  );
}
