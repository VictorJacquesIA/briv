"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadCotacao } from "@/features/compras/actions/purchase-actions";

export function CotacaoUploadForm({
  solicitacaoId,
  fornecedores,
  itens,
}: {
  solicitacaoId: string;
  fornecedores: any[];
  itens: any[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(uploadCotacao, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Upload className="size-4" aria-hidden="true" />
          Enviar cotação (PDF/foto)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar cotação do fornecedor</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
          <div className="space-y-2">
            <Label htmlFor="fornecedor_id">Fornecedor</Label>
            <select
              id="fornecedor_id"
              name="fornecedor_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
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
            <Label>Itens que este fornecedor vai cotar</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {itens.map((item: any) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-sm"
                >
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
          <div className="space-y-2">
            <Label htmlFor="arquivo">Arquivo (PDF ou foto)</Label>
            <Input
              id="arquivo"
              name="arquivo"
              type="file"
              accept="application/pdf,image/*"
              required
            />
          </div>
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <FormToast message={state.message} />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando e extraindo..." : "Enviar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
