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
import { FASE_LABELS } from "@/lib/obras-constants";

const FASE_OPTIONS = Object.entries(FASE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ObraForm({
  gestores,
}: {
  gestores: Array<{ id: string; nome: string }>;
}) {
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
          <Label htmlFor="gestor_id">Gestor de obra</Label>
          <select
            id="gestor_id"
            name="gestor_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Sem gestor por enquanto</option>
            {gestores.map((gestor) => (
              <option key={gestor.id} value={gestor.id}>
                {gestor.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone_responsavel">Telefone de contato</Label>
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
