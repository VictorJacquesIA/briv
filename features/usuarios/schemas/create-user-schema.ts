import { z } from "zod";

export const createUserSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo."),
  email: z.string().email("Informe um e-mail valido."),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  role: z.enum(["adm_geral", "compras", "gestor_obra", "almox"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
