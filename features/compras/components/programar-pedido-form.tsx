"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Label } from "@/components/ui/label";
import { programarPedido } from "@/features/compras/actions/purchase-actions";

export function ProgramarPedidoForm({ id }: { id: string }) {
  const [state, action] = useActionState(programarPedido, {});
  const [localEntrega, setLocalEntrega] = useState("");

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
      <Label htmlFor="local_entrega" className="text-xs">
        Como o pedido vai chegar
      </Label>
      <select
        id="local_entrega"
        name="local_entrega"
        required
        value={localEntrega}
        onChange={(event) => setLocalEntrega(event.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">Selecione</option>
        <option value="obra">Entrega na obra</option>
        <option value="retirada">Retirada autorizada</option>
        <option value="deposito">Entrega no depósito</option>
      </select>
      {localEntrega === "retirada" ? (
        <>
          <Label htmlFor="retirada_autorizado_nome" className="text-xs">
            Nome de quem vai retirar
          </Label>
          <input
            id="retirada_autorizado_nome"
            name="retirada_autorizado_nome"
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
          <Label htmlFor="retirada_autorizado_documento" className="text-xs">
            Documento (opcional)
          </Label>
          <input
            id="retirada_autorizado_documento"
            name="retirada_autorizado_documento"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </>
      ) : null}
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
