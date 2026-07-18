"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createUser,
  type UsuariosActionState,
} from "@/app/(dashboard)/usuarios/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions-shared";

const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as Array<[AppRole, string]>
).map(([value, label]) => ({ value, label }));

export function NovoUsuarioForm() {
  const [state, action] = useActionState<UsuariosActionState, FormData>(
    createUser,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" name="nome" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha temporária</Label>
        <Input id="senha" name="senha" type="password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          defaultValue="gestor_obra"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Criar usuário</Button>
    </form>
  );
}
