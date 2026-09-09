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
import { editarLocacaoFerramenta } from "@/features/ferramentas/actions";

type Fornecedor = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
};

export function EditarLocacaoFerramentaForm({
  ferramentaId,
  ferramentaNome,
  obraNome,
  fornecedorAtualId,
  valorLocacao,
  dataPrevistaDevolucao,
  entregueEm,
  fornecedores,
}: {
  ferramentaId: string;
  ferramentaNome: string;
  obraNome: string;
  fornecedorAtualId: string | null;
  valorLocacao: number | null;
  dataPrevistaDevolucao: string | null;
  entregueEm: string | null;
  fornecedores: Fornecedor[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(editarLocacaoFerramenta, {});

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Ver / editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ferramentaNome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Obra</p>
              <p>{obraNome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entregue em</p>
              <p>
                {entregueEm
                  ? new Date(entregueEm).toLocaleDateString("pt-BR")
                  : "Ainda não"}
              </p>
            </div>
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="ferramenta_id" value={ferramentaId} />
            <div className="space-y-2">
              <Label htmlFor="fornecedor_id">Fornecedor</Label>
              <select
                id="fornecedor_id"
                name="fornecedor_id"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
                defaultValue={fornecedorAtualId ?? ""}
              >
                <option value="">Selecione</option>
                {fornecedores.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome_fantasia ?? fornecedor.razao_social}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_locacao">Valor da locação</Label>
              <Input
                id="valor_locacao"
                name="valor_locacao"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={valorLocacao ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_prevista_devolucao">
                Data prevista de devolução
              </Label>
              <Input
                id="data_prevista_devolucao"
                name="data_prevista_devolucao"
                type="date"
                required
                defaultValue={dataPrevistaDevolucao ?? ""}
              />
            </div>
            {state.message ? (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            ) : null}
            <FormToast message={state.message} />
            <Button type="submit" className="w-full">
              Salvar alterações
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
