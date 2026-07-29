"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSolicitacao } from "@/features/compras/actions/purchase-actions";
import { SolicitacaoItemRow } from "@/features/compras/components/solicitacao-item-row";

const MAX_ANEXOS = 2;
const MAX_ITENS = 10;
const FORM_ID = "solicitacao-form";

// Mesmo formulário pra gestor_obra e adm/compras — só muda quem aparece no
// campo "Responsável": travado no próprio gestor, ou selecionável (adm/
// compras cria em nome do responsável na obra). Começa com 1 insumo; "+
// Adicionar item" vai empilhando mais linhas iguais, uma por vez.
export function SolicitacaoForm({
  obras,
  units,
  currentUser,
  lockResponsavel = true,
  responsaveis = [],
}: {
  obras: Array<{ id: string; nome: string }>;
  units: Array<{ id: string; nome: string }>;
  currentUser: { id: string; nome: string };
  lockResponsavel?: boolean;
  responsaveis?: Array<{ id: string; nome: string }>;
}) {
  const [state, action] = useActionState(createSolicitacao, {});

  // Cada linha tem uma key estável (não o índice, que muda ao remover uma
  // do meio) pra o React não perder o estado interno das outras ao
  // adicionar/remover — o índice usado nos names dos campos vem da posição
  // no array, que o backend só lê de 0 a 9 (Array.from({length:10})).
  const [rowIds, setRowIds] = useState<string[]>(() => [crypto.randomUUID()]);

  function addRow() {
    setRowIds((prev) =>
      prev.length >= MAX_ITENS ? prev : [...prev, crypto.randomUUID()],
    );
  }

  function removeRow(id: string) {
    setRowIds((prev) =>
      prev.length <= 1 ? prev : prev.filter((rowId) => rowId !== id),
    );
  }

  const [anexosPreview, setAnexosPreview] = useState<string[]>([]);
  const [anexosWarning, setAnexosWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAnexosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    anexosPreview.forEach((url) => URL.revokeObjectURL(url));

    if (files.length > MAX_ANEXOS) {
      setAnexosWarning(`Envie no máximo ${MAX_ANEXOS} fotos.`);
      const limited = files.slice(0, MAX_ANEXOS);
      const dataTransfer = new DataTransfer();
      limited.forEach((file) => dataTransfer.items.add(file));
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }
      setAnexosPreview(limited.map((file) => URL.createObjectURL(file)));
      return;
    }

    setAnexosWarning(null);
    setAnexosPreview(files.map((file) => URL.createObjectURL(file)));
  }

  return (
    <form id={FORM_ID} action={action} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
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
        {lockResponsavel ? (
          <div className="space-y-2">
            <Label>Responsável</Label>
            <input
              type="hidden"
              name="responsavel_obra_id"
              value={currentUser.id}
            />
            <p className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
              {currentUser.nome}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="responsavel_obra_id">Responsável da obra</Label>
            <select
              id="responsavel_obra_id"
              name="responsavel_obra_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="">Selecione</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <DatePickerField
          name="data_necessidade"
          placeholder="Data para entrega"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacao">Observações</Label>
        <textarea
          id="observacao"
          name="observacao"
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        {rowIds.map((rowId, index) => (
          <SolicitacaoItemRow
            key={rowId}
            index={index}
            formId={FORM_ID}
            units={units}
            onRemove={rowIds.length > 1 ? () => removeRow(rowId) : undefined}
          />
        ))}
        {rowIds.length < MAX_ITENS ? (
          <Button type="button" variant="outline" onClick={addRow}>
            + Adicionar item
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="anexos">Fotos</Label>
        <Input
          id="anexos"
          name="anexos"
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleAnexosChange}
        />
        {anexosWarning ? (
          <p className="text-sm text-destructive">{anexosWarning}</p>
        ) : null}
        {anexosPreview.length > 0 ? (
          <div className="flex gap-2">
            {anexosPreview.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt="Pré-visualização"
                className="size-20 rounded-md border object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Criar solicitação</Button>
    </form>
  );
}
