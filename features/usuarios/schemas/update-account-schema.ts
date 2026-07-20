import { z } from "zod";

export const updateAccountSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo."),
  email: z.union([
    z.literal(""),
    z.string().email("Informe um e-mail válido."),
  ]),
  senha: z.union([
    z.literal(""),
    z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  ]),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
