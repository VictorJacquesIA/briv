import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

const extractedItemSchema = z.object({
  descricao: z.string(),
  quantidade: z.number().nullable(),
  valor_unitario: z.number().nullable(),
  observacao: z.string().nullable(),
});

const extractionResultSchema = z.object({
  fornecedor_identificado: z.string().nullable(),
  frete: z.number().nullable(),
  prazo_dias: z.number().nullable(),
  forma_pagamento: z.string().nullable(),
  itens: z.array(extractedItemSchema),
});

export type CotacaoExtraction = z.infer<typeof extractionResultSchema>;

type SupportedImageType =
  "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function extractCotacaoFromFile(input: {
  fileBuffer: Buffer;
  contentType: string;
  solicitacaoItens: Array<{
    descricao: string;
    quantidade: number;
    unidade: string;
  }>;
}): Promise<CotacaoExtraction> {
  const base64 = input.fileBuffer.toString("base64");
  const isPdf = input.contentType === "application/pdf";

  const fileBlock = isPdf
    ? ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as const)
    : ({
        type: "image",
        source: {
          type: "base64",
          media_type: input.contentType as SupportedImageType,
          data: base64,
        },
      } as const);

  const itensList = input.solicitacaoItens
    .map(
      (item) => `- ${item.descricao} (qtd ${item.quantidade} ${item.unidade})`,
    )
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          {
            type: "text",
            text: [
              "Este é um orçamento de fornecedor para uma solicitação de compra de materiais de construção.",
              "Os itens solicitados foram:",
              itensList,
              "",
              "Extraia os valores cotados pelo fornecedor: para cada item, tente casar com a lista acima pela descrição e informe preço unitário e quantidade. Extraia também frete, prazo de entrega em dias, forma de pagamento e o nome do fornecedor se identificável.",
              "Se um valor não estiver visível no documento, retorne null para ele — nunca invente ou estime um valor que não esteja escrito no documento.",
            ].join("\n"),
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(extractionResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Não foi possível extrair os dados da cotação.");
  }

  return response.parsed_output;
}
