"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Label } from "@/components/ui/label";
import { gerarCotacaoRequestPdf } from "@/features/compras/actions/purchase-actions";
import { WhatsAppButton } from "@/features/compras/components/whatsapp-button";
import { cotacaoMessage, waLink } from "@/services/whatsapp-service";

export function CotacaoRequestForm({
  solicitacao,
  fornecedores,
}: {
  solicitacao: any;
  fornecedores: any[];
}) {
  const [state, action] = useActionState(gerarCotacaoRequestPdf, {});
  // Só decide pra quem mandar por WhatsApp depois do PDF pronto — o
  // documento é o mesmo pra todos, não precisa escolher fornecedor pra
  // gerar (ver purchase-actions.ts::gerarCotacaoRequestPdf).
  const [fornecedorIds, setFornecedorIds] = useState<Set<string>>(new Set());

  function toggleFornecedor(id: string) {
    setFornecedorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const fornecedoresSelecionados = fornecedores.filter((item) =>
    fornecedorIds.has(item.id),
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="solicitacao_id" value={solicitacao.id} />

      <div className="space-y-2">
        <Label>Itens deste pedido de cotação</Label>
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
          {(solicitacao.itens ?? []).map((item: any) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="item_ids"
                value={item.id}
                defaultChecked
                className="size-4 rounded border"
              />
              {item.descricao}
            </label>
          ))}
        </div>
      </div>

      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Gerar PDF para pedir cotação</Button>
        {state.pdfUrl ? (
          <Button asChild variant="outline">
            <a href={state.pdfUrl} target="_blank" rel="noreferrer">
              Baixar PDF
            </a>
          </Button>
        ) : null}
      </div>

      {state.pdfUrl ? (
        <div className="space-y-2 rounded-lg border p-3">
          <Label>Enviar para quais fornecedores?</Label>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
            {fornecedores.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fornecedorIds.has(item.id)}
                  onChange={() => toggleFornecedor(item.id)}
                  className="size-4 rounded border"
                />
                {item.nome_fantasia ?? item.razao_social}
              </label>
            ))}
          </div>

          {fornecedoresSelecionados.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {fornecedoresSelecionados.map((fornecedor) => (
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
                      pdfUrl: state.pdfUrl,
                    }),
                  )}
                  tipo="cotacao"
                  destinatario={
                    fornecedor.nome_fantasia ?? fornecedor.razao_social
                  }
                  entidadeId={solicitacao.id}
                >
                  Enviar para{" "}
                  {fornecedor.nome_fantasia ?? fornecedor.razao_social}
                </WhatsAppButton>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
