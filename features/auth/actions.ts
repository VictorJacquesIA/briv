"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { loginSchema } from "@/features/auth/schemas/login-schema";

export type AuthState = {
  message?: string;
};

export async function login(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return { message: "E-mail ou senha inválidos." };
    }

    if (/email not confirmed/i.test(error.message)) {
      return { message: "Confirme seu e-mail antes de entrar." };
    }

    return {
      message: friendlyErrorMessage(
        error,
        "Não foi possível entrar. Tente novamente.",
      ),
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
