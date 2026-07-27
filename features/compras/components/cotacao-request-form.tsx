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
  const [fornecedorId, setFornecedorId] = useState("");

  const fornecedor = fornecedores.find((item) => item.id === fornecedorId);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="solicitacao_id" value={solicitacao.id} />
      <div className="space-y-2">
        <Label htmlFor="fornecedor_id_request">Fornecedor</Label>
        <select
          id="fornecedor_id_request"
          name="fornecedor_id"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:max-w-sm"
          required
          value={fornecedorId}
          onChange={(event) => setFornecedorId(event.target.value)}
        >
          <option value="">Selecione</option>
          {fornecedores.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome_fantasia ?? item.razao_social}
            </option>
          ))}
        </select>
      </div>

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
          <>
            <Button asChild variant="outline">
              <a href={state.pdfUrl} target="_blank" rel="noreferrer">
                Baixar PDF
              </a>
            </Button>
            {fornecedor ? (
              <WhatsAppButton
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
                Enviar por WhatsApp
              </WhatsAppButton>
            ) : null}
          </>
        ) : null}
      </div>
    </form>
  );
}
