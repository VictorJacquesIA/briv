"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-message";
import { text } from "@/lib/form-data";
import { getCurrentProfile } from "@/services/profiles-service";

export type PerfilActionState = {
  message?: string;
  success?: boolean;
};

export async function updateProfile(
  _state: PerfilActionState,
  formData: FormData,
): Promise<PerfilActionState> {
  try {
    const profile = await getCurrentProfile();

    if (!profile?.id) {
      return { message: "Sessão expirada, faça login novamente." };
    }

    const nome = text(formData, "nome");
    const telefone = text(formData, "telefone");
    const email = text(formData, "email");
    const senha = text(formData, "senha");
    const foto = formData.get("foto");

    if (!nome) {
      return { message: "Informe o nome." };
    }

    if (senha && senha.length < 6) {
      return { message: "A senha deve ter ao menos 6 caracteres." };
    }

    const supabase = await createClient();
    let fotoUrl = profile.foto_url ?? null;

    if (foto instanceof File && foto.size > 0) {
      if (foto.size > 5 * 1024 * 1024) {
        return { message: "A foto deve ter no máximo 5MB." };
      }

      const ext = foto.name.split(".").pop() ?? "jpg";
      const path = `${profile.cliente_id}/${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, foto, { upsert: true, contentType: foto.type });

      if (uploadError) {
        // O bucket "avatars" só aceita png/jpeg/webp (mesmo padrão universal
        // pra exibir em qualquer navegador) — fotos de iPhone em HEIC (ou
        // sem content-type reconhecido) caem aqui. Sem essa checagem, o
        // upload falhava em silêncio com uma mensagem genérica.
        if (uploadError.message?.toLowerCase().includes("mime type")) {
          return {
            message:
              "Formato de imagem não suportado. Envie uma foto em JPG, PNG ou WebP — fotos de iPhone às vezes ficam em HEIC (ajuste em Ajustes > Câmera > Formatos > Compatibilidade máxima, ou converta antes de enviar).",
          };
        }
        return {
          message: friendlyErrorMessage(
            uploadError,
            "Não foi possível enviar a foto.",
          ),
        };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      fotoUrl = publicUrl;
    }

    const { error: profileError } = await (supabase as any)
      .from("profiles")
      .update({ nome, telefone, foto_url: fotoUrl })
      .eq("id", profile.id);

    if (profileError) {
      return { message: "Não foi possível atualizar o perfil." };
    }

    let emailAlterado = false;
    if (email && email !== profile.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        return {
          message: `Perfil atualizado, mas não foi possível alterar o e-mail: ${emailError.message}`,
        };
      }
      emailAlterado = true;
    }

    if (senha) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: senha,
      });
      if (passwordError) {
        return {
          message: `Perfil atualizado, mas não foi possível alterar a senha: ${passwordError.message}`,
        };
      }
    }

    revalidatePath("/", "layout");

    return {
      success: true,
      message: emailAlterado
        ? "Perfil atualizado. Confira seu e-mail para confirmar a alteração do endereço."
        : "Perfil atualizado com sucesso.",
    };
  } catch (error) {
    return { message: friendlyErrorMessage(error) };
  }
}
