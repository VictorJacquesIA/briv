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
  deleteColaborador,
  toggleColaboradorAtivo,
  updateColaborador,
  type ColaboradorFormState,
} from "@/features/pagamento-mo/actions/mo-actions";

type Colaborador = {
  id: string;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  chave_pix: string | null;
  observacao: string | null;
  ativo: boolean;
};

const emptyState: ColaboradorFormState = {};

export function ColaboradoresTable({
  colaboradores,
  canManage,
}: {
  colaboradores: Colaborador[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [updateState, updateAction] = useActionState(
    updateColaborador,
    emptyState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteColaborador,
    emptyState,
  );

  useEffect(() => {
    if (updateState.success) {
      setEditing(null);
    }
  }, [updateState]);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Função</th>
              <th className="px-3 py-2 text-left">Telefone</th>
              <th className="px-3 py-2 text-left">Chave Pix</th>
              <th className="px-3 py-2 text-left">Status</th>
              {canManage ? (
                <th className="px-3 py-2 text-left">Ações</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((colaborador) => (
              <tr key={colaborador.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{colaborador.nome}</div>
                  {colaborador.observacao ? (
                    <div className="text-xs text-muted-foreground">
                      {colaborador.observacao}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">{colaborador.funcao ?? "-"}</td>
                <td className="px-3 py-2">{colaborador.telefone ?? "-"}</td>
                <td className="px-3 py-2">{colaborador.chave_pix ?? "-"}</td>
                <td className="px-3 py-2">
                  {colaborador.ativo ? "Ativo" : "Inativo"}
                </td>
                {canManage ? (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(colaborador)}
                      >
                        Editar
                      </Button>
                      <form action={toggleColaboradorAtivo}>
                        <input type="hidden" name="id" value={colaborador.id} />
                        <input
                          type="hidden"
                          name="ativo"
                          value={String(colaborador.ativo)}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          {colaborador.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={colaborador.id} />
                        <ConfirmSubmitButton
                          type="submit"
                          variant="destructive"
                          size="sm"
                          message={`Apagar "${colaborador.nome}"? Essa ação não pode ser desfeita.`}
                        >
                          Apagar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {colaboradores.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="h-20 px-3 text-center text-muted-foreground"
                >
                  Nenhum colaborador/prestador cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar colaborador/prestador</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form action={updateAction} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <div className="space-y-2">
                <Label htmlFor="edit_nome">Nome</Label>
                <Input
                  id="edit_nome"
                  name="nome"
                  defaultValue={editing.nome}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_funcao">Função</Label>
                <Input
                  id="edit_funcao"
                  name="funcao"
                  defaultValue={editing.funcao ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_telefone">Telefone</Label>
                <Input
                  id="edit_telefone"
                  name="telefone"
                  defaultValue={editing.telefone ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_chave_pix">Chave Pix</Label>
                <Input
                  id="edit_chave_pix"
                  name="chave_pix"
                  defaultValue={editing.chave_pix ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_observacao">Observação</Label>
                <textarea
                  id="edit_observacao"
                  name="observacao"
                  defaultValue={editing.observacao ?? ""}
                  className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
    </>
  );
}
