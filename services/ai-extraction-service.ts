import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

export type CotacaoExtraction = {
  fornecedor_identificado: string | null;
  itens: Array<{
    descricao: string;
    solicitacao_item_id: string | null;
    quantidade: number | null;
    valor_unitario: number | null;
    observacao: string | null;
  }>;
};

type SupportedImageType =
  "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function extractCotacaoFromFile(input: {
  fileBuffer: Buffer;
  contentType: string;
  solicitacaoItens: Array<{
    id: string;
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
      (item) =>
        `- ID ${item.id}: ${item.descricao} (qtd ${item.quantidade} ${item.unidade})`,
    )
    .join("\n");

  // O campo de correspondência usa um enum com os IDs reais da solicitação
  // — a API garante que a resposta é um desses valores (ou null), em vez de
  // depender da IA copiar o texto da descrição sem nenhum desvio (espaço,
  // acento, pequena reformulação já quebrava a comparação exata no cliente
  // e zerava o valor do item).
  const ids = input.solicitacaoItens.map((item) => item.id);
  const itemSchema =
    ids.length > 0
      ? z.object({
          descricao: z.string(),
          solicitacao_item_id: z.enum(ids as [string, ...string[]]).nullable(),
          quantidade: z.number().nullable(),
          valor_unitario: z.number().nullable(),
          observacao: z.string().nullable(),
        })
      : z.object({
          descricao: z.string(),
          solicitacao_item_id: z.null(),
          quantidade: z.number().nullable(),
          valor_unitario: z.number().nullable(),
          observacao: z.string().nullable(),
        });

  const resultSchema = z.object({
    fornecedor_identificado: z.string().nullable(),
    itens: z.array(itemSchema),
  });

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
              "Os itens solicitados foram (cada um com um ID):",
              itensList,
              "",
              "Extraia cada linha de produto/preço do documento. Para cada linha extraída, preencha 'solicitacao_item_id' com o ID do item da lista acima que ela corresponde — mesmo que o nome do fornecedor seja bem diferente (marca, modelo, sigla do fabricante, especificação técnica). O que importa é ser o mesmo material/produto, não o texto ser parecido: por exemplo 'QUARTZOLIT PREMIUM FLEX CINZA AC3 20KG' deve casar com o item 'ARGAMASSA COLANTE AC3' da lista, porque é o mesmo produto (argamassa colante tipo AC3) vendido por uma marca específica. Se a linha do documento não corresponder a nenhum item da lista (item extra que não foi pedido), deixe 'solicitacao_item_id' como null.",
              "'descricao' continua sendo o texto do produto exatamente como está escrito no documento do fornecedor (não altere).",
              "Extraia também o nome do fornecedor se identificável.",
              "Se um valor não estiver visível no documento, retorne null para ele — nunca invente ou estime um valor que não esteja escrito no documento.",
            ].join("\n"),
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(resultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Não foi possível extrair os dados da cotação.");
  }

  return response.parsed_output;
}
