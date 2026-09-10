"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarSolicitacao } from "@/features/compras/actions/purchase-actions";

const MAX_ITENS = 10;

type ItemExistente = {
  id: string;
  item_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  observacao: string | null;
};

type Linha = {
  rowId: string;
  itemId: string | null;
  itemCatalogoId: string | null;
  descricao: string;
  quantidade: string;
  unidade: string;
  observacao: string;
};

function linhaFromItem(item: ItemExistente): Linha {
  return {
    rowId: item.id,
    itemId: item.id,
    itemCatalogoId: item.item_id,
    descricao: item.descricao,
    quantidade: String(item.quantidade),
    unidade: item.unidade,
    observacao: item.observacao ?? "",
  };
}

function linhaVazia(): Linha {
  return {
    rowId: crypto.randomUUID(),
    itemId: null,
    itemCatalogoId: null,
    descricao: "",
    quantidade: "",
    unidade: "",
    observacao: "",
  };
}

// Edição só fica disponível enquanto a solicitação está em "Nova
// Solicitação" (antes de entrar em cotação) — o gestor que criou corrige
// quantidade/descrição errada ou adiciona/remove um item sem precisar
// cancelar e recriar tudo.
export function EditarSolicitacaoForm({
  solicitacaoId,
  prioridade,
  observacao,
  dataNecessidade,
  itens,
}: {
  solicitacaoId: string;
  prioridade: string;
  observacao: string | null;
  dataNecessidade: string | null;
  itens: ItemExistente[];
}) {
  const [state, action] = useActionState(editarSolicitacao, {});
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    itens.length > 0 ? itens.map(linhaFromItem) : [linhaVazia()],
  );

  function updateLinha(rowId: string, patch: Partial<Linha>) {
    setLinhas((prev) =>
      prev.map((linha) =>
        linha.rowId === rowId ? { ...linha, ...patch } : linha,
      ),
    );
  }

  function addLinha() {
    setLinhas((prev) =>
      prev.length >= MAX_ITENS ? prev : [...prev, linhaVazia()],
    );
  }

  function removeLinha(rowId: string) {
    setLinhas((prev) =>
      prev.length <= 1 ? prev : prev.filter((linha) => linha.rowId !== rowId),
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit_prioridade">Prioridade</Label>
          <select
            id="edit_prioridade"
            name="prioridade"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue={prioridade}
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <DatePickerField
          name="data_necessidade"
          placeholder="Data para entrega"
          defaultValue={dataNecessidade}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_observacao">Observações</Label>
        <textarea
          id="edit_observacao"
          name="observacao"
          defaultValue={observacao ?? ""}
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {linhas.map((linha, index) => (
          <div
            key={linha.rowId}
            className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm"
          >
            <input
              type="hidden"
              name={`item_${index}_id`}
              value={linha.itemId ?? ""}
            />
            <input
              type="hidden"
              name={`item_${index}_item_id`}
              value={linha.itemCatalogoId ?? ""}
            />
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`item_${index}_descricao`}>Descrição</Label>
                <Input
                  id={`item_${index}_descricao`}
                  name={`item_${index}_descricao`}
                  value={linha.descricao}
                  onChange={(event) =>
                    updateLinha(linha.rowId, { descricao: event.target.value })
                  }
                  required
                />
              </div>
              {linhas.length > 1 ? (
                <button
                  type="button"
                  className="mt-6 text-xs text-muted-foreground underline"
                  onClick={() => removeLinha(linha.rowId)}
                >
                  Remover
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`item_${index}_quantidade`}>Quantidade</Label>
                <Input
                  id={`item_${index}_quantidade`}
                  name={`item_${index}_quantidade`}
                  inputMode="decimal"
                  value={linha.quantidade}
                  onChange={(event) =>
                    updateLinha(linha.rowId, { quantidade: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`item_${index}_unidade`}>Unidade</Label>
                <Input
                  id={`item_${index}_unidade`}
                  name={`item_${index}_unidade`}
                  value={linha.unidade}
                  onChange={(event) =>
                    updateLinha(linha.rowId, { unidade: event.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`item_${index}_observacao`}>Observação</Label>
              <Input
                id={`item_${index}_observacao`}
                name={`item_${index}_observacao`}
                value={linha.observacao}
                onChange={(event) =>
                  updateLinha(linha.rowId, { observacao: event.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {linhas.length < MAX_ITENS ? (
        <Button type="button" variant="outline" onClick={addLinha}>
          + Adicionar item
        </Button>
      ) : null}

      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Salvar alterações</Button>
    </form>
  );
}
