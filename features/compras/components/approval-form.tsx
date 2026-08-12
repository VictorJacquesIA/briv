"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { enviarParaAprovacao } from "@/features/compras/actions/purchase-actions";
import { WhatsAppButton } from "@/features/compras/components/whatsapp-button";
import { aprovacaoMessage, waLink } from "@/services/whatsapp-service";

export function ApprovalForm({
  solicitacao,
  approvalUrl: linkExistente,
}: {
  solicitacao: any;
  approvalUrl?: string | null;
}) {
  const [state, action] = useActionState(enviarParaAprovacao, {});
  const approvalUrl = state.approvalUrl ?? linkExistente ?? null;

  // Uma vez que o link existe, não faz sentido gerar de novo (invalidaria o
  // que já pode ter sido compartilhado) — só oferece o envio por WhatsApp.
  if (approvalUrl) {
    return (
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
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="solicitacao_id" value={solicitacao.id} />
      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Enviar para aprovação</Button>
    </form>
  );
}
