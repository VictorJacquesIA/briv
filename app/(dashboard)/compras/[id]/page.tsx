import Link from "next/link";

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
import { CotacaoForm } from "@/features/compras/components/cotacao-form";
import { CotacaoReviewForm } from "@/features/compras/components/cotacao-review-form";
import { CotacaoUploadForm } from "@/features/compras/components/cotacao-upload-form";
import { EstoqueDecisionForm } from "@/features/compras/components/estoque-decision-form";
import { ProgramarPedidoForm } from "@/features/compras/components/programar-pedido-form";
import { WhatsAppButton } from "@/features/compras/components/whatsapp-button";
import { createClient } from "@/lib/supabase/server";
import {
  getPurchaseFormOptions,
  getSolicitacaoDetail,
  purchaseFlow,
  statusLabels,
  STATUSES_AGUARDANDO_APROVACAO,
  STATUSES_AGUARDANDO_COTACAO,
  STATUSES_EM_COTACAO,
  STATUSES_TERMINAIS,
} from "@/services/compras-service";
import { getEstoqueDisponivelPorItem } from "@/services/estoque-service";
import {
  aprovacaoMessage,
  cotacaoMessage,
  pedidoMessage,
  waLink,
} from "@/services/whatsapp-service";

export default async function CompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [solicitacao, options] = await Promise.all([
    getSolicitacaoDetail(id),
    getPurchaseFormOptions(),
  ]);
  const approvalUrl = solicitacao.aprovacao_token
    ? `/aprovacao/${solicitacao.aprovacao_token}`
    : null;
  const pedido = solicitacao.pedidos?.[0];

  const precisaDecidirEstoque =
    STATUSES_AGUARDANDO_COTACAO.includes(solicitacao.status) &&
    !solicitacao.estoque_decidido_at;
  const itemIds = precisaDecidirEstoque
    ? (solicitacao.itens ?? [])
        .map((item: any) => item.item_id)
        .filter((itemId: string | null): itemId is string => Boolean(itemId))
    : [];
  const supabase = precisaDecidirEstoque
    ? ((await createClient()) as any)
    : null;
  const [disponibilidade, orcamentoItensResult] = precisaDecidirEstoque
    ? await Promise.all([
        getEstoqueDisponivelPorItem(itemIds),
        supabase
          .from("obra_orcamento_itens")
          .select("id,descricao")
          .eq("obra_id", solicitacao.obra_id)
          .eq("tipo", "insumos")
          .order("descricao"),
      ])
    : [{}, { data: [] }];
  const orcamentoItens: Array<{ id: string; descricao: string }> =
    orcamentoItensResult.data ?? [];

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {options.fornecedores.slice(0, 6).map((fornecedor: any) => (
            <WhatsAppButton
              key={fornecedor.id}
              href={waLink(
                fornecedor.whatsapp ?? fornecedor.telefone,
                cotacaoMessage({
                  codigo: solicitacao.codigo ?? solicitacao.id.slice(0, 8),
                  obra: solicitacao.obra?.nome ?? "-",
                  fornecedor:
                    fornecedor.nome_fantasia ?? fornecedor.razao_social,
                  template: fornecedor.mensagem_template,
                }),
              )}
              tipo="cotacao"
              destinatario={fornecedor.nome_fantasia ?? fornecedor.razao_social}
              entidadeId={solicitacao.id}
            >
              Enviar cotação
            </WhatsAppButton>
          ))}
          <WhatsAppButton
            href={waLink(
              solicitacao.responsavel_obra?.whatsapp ??
                solicitacao.responsavel_obra?.telefone,
              aprovacaoMessage({
                codigo: solicitacao.codigo ?? solicitacao.id.slice(0, 8),
                obra: solicitacao.obra?.nome ?? "-",
                approvalUrl,
              }),
            )}
            tipo="aprovacao"
            destinatario={solicitacao.responsavel_obra?.nome ?? "Gestor"}
            entidadeId={solicitacao.id}
          >
            Enviar aprovação
          </WhatsAppButton>
          {pedido ? (
            <WhatsAppButton
              href={waLink(
                pedido.fornecedor?.whatsapp ?? pedido.fornecedor?.telefone,
                pedidoMessage({
                  pedido: pedido.numero,
                  fornecedor:
                    pedido.fornecedor?.nome_fantasia ??
                    pedido.fornecedor?.razao_social,
                  pdfUrl: pedido.pdf_url,
                }),
              )}
              tipo="pedido"
              destinatario={
                pedido.fornecedor?.nome_fantasia ??
                pedido.fornecedor?.razao_social
              }
              entidadeId={solicitacao.id}
            >
              Enviar pedido
            </WhatsAppButton>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fluxo obrigatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {purchaseFlow.map((step) => (
              <span
                key={step}
                className="rounded-md border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {step}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

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
              />
            ) : null}
            {STATUSES_AGUARDANDO_APROVACAO.includes(solicitacao.status) ? (
              <ApprovalForm solicitacao={solicitacao} />
            ) : null}
            {approvalUrl ? (
              <p className="break-all rounded-md border border-border bg-secondary p-3 text-xs text-muted-foreground">
                Link público: {approvalUrl}
              </p>
            ) : null}
            {pedido?.pdf_url ? (
              <Button asChild variant="outline" className="w-full">
                <a href={pedido.pdf_url} target="_blank" rel="noreferrer">
                  Abrir PDF do pedido
                </a>
              </Button>
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
              <FlowButton
                id={solicitacao.id}
                etapa="finalizada"
                label="Finalizar"
              />
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

      {precisaDecidirEstoque ? (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Materiais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Quantidade</th>
                  <th className="px-3 py-2 text-left">Unidade</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                </tr>
              </thead>
              <tbody>
                {(solicitacao.itens ?? []).map((item: any) => (
                  <tr key={item.id} className="border-t border-border/80">
                    <td className="px-3 py-2">{item.descricao}</td>
                    <td className="px-3 py-2">
                      {Number(item.quantidade).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">{item.unidade}</td>
                    <td className="px-3 py-2">{item.observacao ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(solicitacao.cotacoes ?? []).some(
        (cotacao: any) => cotacao.arquivo_path && !cotacao.validado_at,
      ) ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Cotações recebidas aguardando validação
          </h2>
          {(solicitacao.cotacoes ?? [])
            .filter(
              (cotacao: any) => cotacao.arquivo_path && !cotacao.validado_at,
            )
            .map((cotacao: any) => (
              <CotacaoReviewForm
                key={cotacao.id}
                solicitacaoId={solicitacao.id}
                cotacao={cotacao}
                itens={solicitacao.itens ?? []}
              />
            ))}
        </div>
      ) : null}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo lado a lado</CardTitle>
        </CardHeader>
        <CardContent>
          <Comparativo solicitacao={solicitacao} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico auditável</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(solicitacao.historico ?? []).map((entry: any) => (
            <div key={entry.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{entry.acao}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
