"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSolicitacao } from "@/features/compras/actions/purchase-actions";
import {
  createUnit,
  createItem,
} from "@/features/compras/actions/item-actions";
import type { ItemActionState } from "@/features/compras/actions/item-actions";

type Options = {
  clientes: any[];
  obras: any[];
  responsaveis: any[];
  items: any[];
};

type OrcamentoItem = { id: string; descricao: string };

export function SolicitacaoForm({
  options,
  lockResponsavel = false,
  currentUser,
  orcamentoItensByObra = {},
}: {
  options: Options;
  lockResponsavel?: boolean;
  currentUser?: { id: string; nome: string } | null;
  orcamentoItensByObra?: Record<string, OrcamentoItem[]>;
}) {
  const [state, action] = useActionState(createSolicitacao, {});
  const [unitState, unitAction] = useActionState(
    createUnit,
    {} as ItemActionState,
  );
  const [itemState, itemAction] = useActionState(
    createItem,
    {} as ItemActionState,
  );
  const [obraId, setObraId] = useState("");
  const orcamentoItens = useMemo(
    () => orcamentoItensByObra[obraId] ?? [],
    [obraId, orcamentoItensByObra],
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Cliente</Label>
          <select
            id="cliente_id"
            name="cliente_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required
          >
            {options.clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome_fantasia ?? cliente.razao_social}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="obra_id">Obra</Label>
          <select
            id="obra_id"
            name="obra_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required
            value={obraId}
            onChange={(event) => setObraId(event.target.value)}
          >
            <option value="">Selecione</option>
            {options.obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.nome}
              </option>
            ))}
          </select>
        </div>
        {lockResponsavel && currentUser ? (
          <div className="space-y-2">
            <Label>Responsável da obra</Label>
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
            >
              <option value="">Selecione</option>
              {options.responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="prioridade">Prioridade</Label>
          <select
            id="prioridade"
            name="prioridade"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue="normal"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
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
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Materiais</h2>
        </div>
        {/* Botões com formAction em vez de <form> aninhado — HTML não permite
            form dentro de form; formAction troca só a action deste submit,
            usando o form principal que já envolve este bloco. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <Input name="unidade_nome" placeholder="Nova unidade (ex: un)" />
            <Button type="submit" formAction={unitAction} variant="outline">
              Criar unidade
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              name="item_nome"
              placeholder="Novo item (ex: Cimento 50kg)"
            />
            <Button type="submit" formAction={itemAction} variant="outline">
              Criar item
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border p-3 lg:grid-cols-12"
            >
              <select
                name={`item_${index}_item_id`}
                className="h-10 rounded-md border bg-background px-3 text-sm lg:col-span-3"
              >
                <option value="">Item do catálogo</option>
                {options.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} —{" "}
                    {item.estoqueAtual > 0
                      ? `${item.estoqueAtual} em estoque`
                      : "sem estoque"}
                  </option>
                ))}
              </select>
              <Input
                name={`item_${index}_descricao`}
                placeholder="Descrição"
                className="lg:col-span-3"
                required={index === 0}
              />
              <Input
                name={`item_${index}_quantidade`}
                placeholder="Qtd."
                inputMode="decimal"
                className="lg:col-span-1"
                required={index === 0}
              />
              <Input
                name={`item_${index}_unidade`}
                placeholder="Un."
                className="lg:col-span-1"
                required={index === 0}
              />
              <select
                name={`item_${index}_orcamento_item_id`}
                className="h-10 rounded-md border bg-background px-3 text-sm lg:col-span-2"
                disabled={!obraId}
                defaultValue=""
              >
                <option value="">
                  {obraId ? "Centro de custo" : "Selecione a obra"}
                </option>
                {orcamentoItens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.descricao}
                  </option>
                ))}
              </select>
              <Input
                name={`item_${index}_observacao`}
                placeholder="Observação"
                className="lg:col-span-2"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anexos">Anexos</Label>
        <Input id="anexos" name="anexos" type="file" multiple />
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Criar solicitação</Button>
    </form>
  );
}
