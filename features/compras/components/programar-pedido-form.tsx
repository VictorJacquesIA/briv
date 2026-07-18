"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Label } from "@/components/ui/label";
import { programarPedido } from "@/features/compras/actions/purchase-actions";

export function ProgramarPedidoForm({ id }: { id: string }) {
  const [state, action] = useActionState(programarPedido, {});

  return (
    <form action={action} className="space-y-2 rounded-md border p-3">
      <input type="hidden" name="solicitacao_id" value={id} />
      <Label htmlFor="prazo_confirmado_dias" className="text-xs">
        Prazo confirmado (dias)
      </Label>
      <input
        id="prazo_confirmado_dias"
        name="prazo_confirmado_dias"
        inputMode="numeric"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      />
      <Label htmlFor="data_prevista_entrega" className="text-xs">
        Data prevista de entrega
      </Label>
      <input
        id="data_prevista_entrega"
        name="data_prevista_entrega"
        type="date"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      />
      {state.message ? (
        <p className="text-xs text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit" className="w-full" size="sm">
        Programar pedido
      </Button>
    </form>
  );
}
