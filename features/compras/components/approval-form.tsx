"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { enviarParaAprovacao } from "@/features/compras/actions/purchase-actions";

export function ApprovalForm({ solicitacao }: { solicitacao: any }) {
  const [state, action] = useActionState(enviarParaAprovacao, {});

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
