import { z } from "zod";

export const prioridadeSchema = z.enum(["baixa", "normal", "alta", "urgente"]);

export const createSolicitacaoSchema = z.object({
  clienteId: z.string().uuid(),
  obraId: z.string().uuid(),
  responsavelObraId: z.string().uuid(),
  prioridade: prioridadeSchema,
  observacao: z.string().optional(),
  dataNecessidade: z.string().optional(),
});

export const cotacaoFornecedorSchema = z.object({
  fornecedorId: z.string().uuid(),
  frete: z.coerce.number().nonnegative().optional(),
  prazoDias: z.coerce.number().int().nonnegative().optional(),
  formaPagamento: z.string().optional(),
  observacoesGerais: z.string().optional(),
});

export type PrioridadeSolicitacao = z.infer<typeof prioridadeSchema>;
