import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

const extractedItemSchema = z.object({
  descricao: z.string(),
  solicitacao_item_descricao: z.string().nullable(),
  quantidade: z.number().nullable(),
  valor_unitario: z.number().nullable(),
  observacao: z.string().nullable(),
});

const extractionResultSchema = z.object({
  fornecedor_identificado: z.string().nullable(),
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
              "Extraia cada linha de produto/preço do documento. Para cada linha extraída, preencha 'solicitacao_item_descricao' com o texto EXATO (copiado literalmente, igual está na lista acima) do item da lista que ela corresponde — mesmo que o nome do fornecedor seja bem diferente (marca, modelo, sigla do fabricante, especificação técnica). O que importa é ser o mesmo material/produto, não o texto ser parecido: por exemplo 'QUARTZOLIT PREMIUM FLEX CINZA AC3 20KG' deve casar com 'ARGAMASSA COLANTE AC3' da lista, porque é o mesmo produto (argamassa colante tipo AC3) vendido por uma marca específica. Se a linha do documento não corresponder a nenhum item da lista (item extra que não foi pedido), deixe 'solicitacao_item_descricao' como null.",
              "'descricao' continua sendo o texto do produto exatamente como está escrito no documento do fornecedor (não altere).",
              "Extraia também o nome do fornecedor se identificável.",
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
