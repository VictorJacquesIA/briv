"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCacamba } from "@/features/servicos-obra/actions";

type OrcamentoItem = { id: string; descricao: string };

export function CacambaOrcamentoForm({
  cacambaId,
  orcamentoItemId,
  valor,
  orcamentoItens,
}: {
  cacambaId: string;
  orcamentoItemId: string | null;
  valor: number | null;
  orcamentoItens: OrcamentoItem[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateCacamba, {});

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Centro de custo / valor
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Centro de custo e valor da caçamba</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="cacamba_id" value={cacambaId} />
          <div className="space-y-2">
            <Label htmlFor={`orcamento_item_id_${cacambaId}`}>
              Centro de custo
            </Label>
            <select
              id={`orcamento_item_id_${cacambaId}`}
              name="orcamento_item_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue={orcamentoItemId ?? ""}
              disabled={orcamentoItens.length === 0}
            >
              <option value="">Sem centro de custo</option>
              {orcamentoItens.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.descricao}
                </option>
              ))}
            </select>
            {orcamentoItens.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Esta obra ainda não tem itens de orçamento do tipo Serviços
                cadastrados.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`valor_${cacambaId}`}>Valor (R$)</Label>
            <Input
              id={`valor_${cacambaId}`}
              name="valor"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={valor != null ? String(valor) : ""}
            />
          </div>
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <FormToast message={state.message} />
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
