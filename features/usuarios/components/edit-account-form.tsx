"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateUserAccount,
  type UsuariosActionState,
} from "@/app/(dashboard)/usuarios/actions";

export function EditAccountForm({
  profileId,
  nome,
  email,
}: {
  profileId: string;
  nome: string;
  email: string | null;
}) {
  const [state, action] = useActionState<UsuariosActionState, FormData>(
    updateUserAccount,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="profileId" value={profileId} />
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={nome} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          placeholder="Deixe em branco para não alterar"
          autoComplete="new-password"
        />
      </div>
      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Salvar conta</Button>
    </form>
  );
}
