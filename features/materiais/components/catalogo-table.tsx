"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bulkDeleteItensCatalogo,
  bulkUpdateItensCatalogo,
  deleteItemCatalogo,
  toggleItemAtivo,
  updateItemCatalogo,
  type ItemFormState,
} from "@/features/materiais/actions/materiais-actions";

type Item = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  unidade: { nome: string } | null;
};

type Unidade = { id: string; nome: string };

const emptyState: ItemFormState = {};

function SelectedIdsFields({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
    </>
  );
}

export function CatalogoTable({
  items,
  unidades,
  canEdit,
}: {
  items: Item[];
  unidades: Unidade[];
  canEdit: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [bulkUnidadeNome, setBulkUnidadeNome] = useState("");

  const [updateState, updateAction] = useActionState(
    updateItemCatalogo,
    emptyState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteItemCatalogo,
    emptyState,
  );
  const [bulkUpdateState, bulkUpdateAction] = useActionState(
    bulkUpdateItensCatalogo,
    emptyState,
  );
  const [bulkDeleteState, bulkDeleteAction] = useActionState(
    bulkDeleteItensCatalogo,
    emptyState,
  );

  const selectedIdsList = Array.from(selectedIds);
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === items.length
        ? new Set()
        : new Set(items.map((item) => item.id)),
    );
  }

  useEffect(() => {
    if (updateState.success) {
      setEditingItem(null);
    }
  }, [updateState]);

  useEffect(() => {
    if (bulkUpdateState.success || bulkDeleteState.success) {
      setSelectedIds(new Set());
      setBulkUnidadeNome("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkUpdateState, bulkDeleteState]);

  return (
    <div className="space-y-3">
      <datalist id="unidades-sugestoes-catalogo">
        {unidades.map((unidade) => (
          <option key={unidade.id} value={unidade.nome} />
        ))}
      </datalist>

      {canEdit && selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm font-medium">
            {selectedIds.size} selecionado(s)
          </p>

          <form action={bulkUpdateAction}>
            <SelectedIdsFields ids={selectedIdsList} />
            <input type="hidden" name="ativo" value="true" />
            <Button type="submit" variant="outline" size="sm">
              Ativar
            </Button>
          </form>

          <form action={bulkUpdateAction}>
            <SelectedIdsFields ids={selectedIdsList} />
            <input type="hidden" name="ativo" value="false" />
            <Button type="submit" variant="outline" size="sm">
              Desativar
            </Button>
          </form>

          <form action={bulkUpdateAction} className="flex items-center gap-2">
            <SelectedIdsFields ids={selectedIdsList} />
            <Input
              name="unidade_nome"
              list="unidades-sugestoes-catalogo"
              placeholder="Alterar unidade para..."
              value={bulkUnidadeNome}
              onChange={(event) => setBulkUnidadeNome(event.target.value)}
              className="h-9 w-44"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!bulkUnidadeNome.trim()}
            >
              Aplicar
            </Button>
          </form>

          <form action={bulkDeleteAction}>
            <SelectedIdsFields ids={selectedIdsList} />
            <ConfirmSubmitButton
              type="submit"
              variant="destructive"
              size="sm"
              message={`Apagar ${selectedIds.size} item(ns) selecionado(s)? Itens já usados em compras ou estoque não serão apagados.`}
            >
              Apagar selecionados
            </ConfirmSubmitButton>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              {canEdit ? (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </th>
              ) : null}
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Status</th>
              {canEdit ? <th className="px-3 py-2 text-left">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                {canEdit ? (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Selecionar ${item.nome}`}
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <div className="font-medium">{item.nome}</div>
                  {item.descricao ? (
                    <div className="text-xs text-muted-foreground">
                      {item.descricao}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">{item.unidade?.nome ?? "-"}</td>
                <td className="px-3 py-2">
                  {item.ativo ? "Ativo" : "Inativo"}
                </td>
                {canEdit ? (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItem(item)}
                      >
                        Editar
                      </Button>
                      <form action={toggleItemAtivo}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="ativo"
                          value={String(item.ativo)}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          {item.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <ConfirmSubmitButton
                          type="submit"
                          variant="destructive"
                          size="sm"
                          message={`Apagar "${item.nome}"? Essa ação não pode ser desfeita.`}
                        >
                          Apagar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 5 : 3}
                  className="h-20 px-3 text-center text-muted-foreground"
                >
                  Nenhum item cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          {editingItem ? (
            <form action={updateAction} className="space-y-4">
              <input type="hidden" name="id" value={editingItem.id} />
              <div className="space-y-2">
                <Label htmlFor="edit_nome">Nome</Label>
                <Input
                  id="edit_nome"
                  name="nome"
                  defaultValue={editingItem.nome}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_descricao">Descrição</Label>
                <Input
                  id="edit_descricao"
                  name="descricao"
                  defaultValue={editingItem.descricao ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_unidade_nome">Unidade</Label>
                <Input
                  id="edit_unidade_nome"
                  name="unidade_nome"
                  list="unidades-sugestoes-catalogo"
                  defaultValue={editingItem.unidade?.nome ?? ""}
                  required
                />
              </div>
              {updateState.message ? (
                <p className="text-sm text-muted-foreground">
                  {updateState.message}
                </p>
              ) : null}
              <Button type="submit" className="w-full">
                Salvar alterações
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <FormToast message={updateState.message} />
      <FormToast message={deleteState.message} />
      <FormToast message={bulkUpdateState.message} />
      <FormToast message={bulkDeleteState.message} />
    </div>
  );
}
