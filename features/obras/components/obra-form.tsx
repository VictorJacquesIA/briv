"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createObra,
  type ObraActionState,
} from "@/features/obras/actions/obra-actions";

const FASE_OPTIONS = [
  { value: "fase_1", label: "Fase 1" },
  { value: "fase_2", label: "Fase 2" },
  { value: "fase_3", label: "Fase 3" },
  { value: "concluida", label: "Concluída" },
];

export function ObraForm({ responsaveis }: { responsaveis: any[] }) {
  const [state, action] = useActionState<ObraActionState, FormData>(
    createObra,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da obra</Label>
          <Input id="nome" name="nome" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fase">Fase</Label>
          <select
            id="fase"
            name="fase"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue="fase_1"
          >
            {FASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsavel_id">Responsável</Label>
          <select
            id="responsavel_id"
            name="responsavel_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Selecione</option>
            {responsaveis.map((responsavel) => (
              <option key={responsavel.id} value={responsavel.id}>
                {responsavel.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone_responsavel">Telefone do responsável</Label>
          <Input id="telefone_responsavel" name="telefone_responsavel" />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" />
        </div>
      </div>
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Criar obra</Button>
    </form>
  );
}
