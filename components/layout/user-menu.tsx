"use client";

import { useActionState, useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout } from "@/features/auth/actions";
import { updateProfile } from "@/features/perfil/actions";
import {
  normalizeRole,
  ROLE_LABELS,
  type AppRole,
} from "@/lib/permissions-shared";

type UserMenuProps = {
  profile: {
    id?: string | null;
    nome?: string | null;
    role: AppRole;
    telefone?: string | null;
    email?: string | null;
    foto_url?: string | null;
  } | null;
};

export function UserMenu({ profile }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateProfile, {});
  const [preview, setPreview] = useState<string | null>(
    profile?.foto_url ?? null,
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state]);

  function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">{profile?.nome ?? "Usuario"}</p>
        <p className="text-xs text-muted-foreground">
          {profile
            ? ROLE_LABELS[normalizeRole(profile.role)]
            : "Perfil pendente"}
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Editar perfil"
          className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-card"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <UserRound
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-card">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound
                    className="size-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="foto">Foto</Label>
                <Input
                  id="foto"
                  name="foto"
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={profile?.nome ?? ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                defaultValue={profile?.telefone ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile?.email ?? ""}
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
            <Button type="submit" className="w-full">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <form action={logout}>
        <Button variant="ghost" size="icon" aria-label="Sair" title="Sair">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
