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
import { solicitarFerramenta } from "@/features/ferramentas/actions";

export function SolicitarFerramentaForm({
  obras,
}: {
  obras: Array<{ id: string; nome: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(solicitarFerramenta, {});

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Solicitar ferramenta
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar ferramenta</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="obra_id">Obra</Label>
            <select
              id="obra_id"
              name="obra_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="">Selecione</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Qual ferramenta você precisa</Label>
            <Input
              id="descricao"
              name="descricao"
              placeholder="Ex.: furadeira de impacto"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Input id="observacao" name="observacao" />
          </div>
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <FormToast message={state.message} />
          <Button type="submit" className="w-full">
            Solicitar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
