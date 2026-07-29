"use client";

import { useActionState, useState } from "react";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormToast } from "@/components/ui/form-toast";
import { Label } from "@/components/ui/label";
import { confirmarRecebimentoPedido } from "@/features/compras/actions/purchase-actions";

const LOCAL_ENTREGA_LABELS: Record<string, string> = {
  obra: "Obra",
  deposito: "Depósito",
};

export function ConfirmarRecebimentoForm({
  id,
  localEntrega,
  retiradaAutorizadoNome,
}: {
  id: string;
  localEntrega: string | null;
  retiradaAutorizadoNome?: string | null;
}) {
  const [state, action] = useActionState(confirmarRecebimentoPedido, {});
  const [destinoFinal, setDestinoFinal] = useState("");

  if (!localEntrega) {
    return (
      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Programe o pedido (escolha como ele vai chegar) antes de confirmar o
        recebimento.
      </p>
    );
  }

  const isRetirada = localEntrega === "retirada";

  return (
    <form action={action} className="space-y-2 rounded-md border p-3">
      <input type="hidden" name="solicitacao_id" value={id} />
      <p className="text-sm font-medium">
        {isRetirada
          ? `Retirada pendente${retiradaAutorizadoNome ? ` — autorizado: ${retiradaAutorizadoNome}` : ""}`
          : `Entrega pendente (${LOCAL_ENTREGA_LABELS[localEntrega] ?? localEntrega})`}
      </p>
      {isRetirada ? (
        <>
          <Label htmlFor="destino_final" className="text-xs">
            Destino final
          </Label>
          <select
            id="destino_final"
            name="destino_final"
            required
            value={destinoFinal}
            onChange={(event) => setDestinoFinal(event.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Selecione</option>
            <option value="obra">Obra</option>
            <option value="deposito">Depósito</option>
          </select>
        </>
      ) : null}
      {state.message ? (
        <p className="text-xs text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <ConfirmSubmitButton
        type="submit"
        className="w-full"
        size="sm"
        message="Confirmar o recebimento do pedido?"
      >
        Confirmar recebimento
      </ConfirmSubmitButton>
    </form>
  );
}
