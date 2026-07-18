"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type AuthState } from "@/features/auth/actions";
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/login-schema";
import { SubmitButton } from "@/features/auth/components/submit-button";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const {
    register,
    formState: { errors },
    trigger,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={async (event) => {
        const isValid = await trigger();
        if (!isValid) {
          event.preventDefault();
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="compras@una.com.br"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      {state.message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
