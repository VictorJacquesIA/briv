"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validarCotacao } from "@/features/compras/actions/purchase-actions";
import { ValorUnitarioTotalInput } from "@/features/compras/components/valor-unitario-total-input";

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function matchExtractedItem(
  item: { id: string; descricao: string },
  extractedItens: any[],
) {
  // 1ª tentativa: a própria IA já diz o ID exato do item da solicitação que
  // essa linha corresponde — ela entende que "QUARTZOLIT PREMIUM FLEX CINZA
  // AC3 20KG" é o mesmo produto que "ARGAMASSA COLANTE AC3", mesmo sem
  // nenhuma palavra em comum. Casar por ID (garantido pelo schema da IA)
  // em vez de por texto copiado evita falhar por qualquer pequeno desvio
  // de digitação/formatação.
  const porId = extractedItens.find(
    (extracted: any) => extracted.solicitacao_item_id === item.id,
  );

  if (porId) {
    return porId;
  }

  const normalizedDescricao = normalize(item.descricao);

  // Fallback pra cotações antigas, extraídas antes desse campo existir —
  // a IA respondia com o texto copiado (solicitacao_item_descricao) em vez
  // do ID.
  const porCorrespondenciaDaIa = extractedItens.find((extracted: any) => {
    const normalizedCorrespondencia = normalize(
      String(extracted.solicitacao_item_descricao ?? ""),
    );
    return (
      normalizedCorrespondencia.length > 0 &&
      normalizedCorrespondencia === normalizedDescricao
    );
  });

  if (porCorrespondenciaDaIa) {
    return porCorrespondenciaDaIa;
  }

  // Último fallback: tenta por texto bruto extraído do documento.
  return extractedItens.find((extracted: any) => {
    const normalizedExtracted = normalize(String(extracted.descricao ?? ""));
    return (
      normalizedExtracted.length > 0 &&
      (normalizedDescricao.includes(normalizedExtracted) ||
        normalizedExtracted.includes(normalizedDescricao))
    );
  });
}

export function CotacaoReviewForm({
  solicitacaoId,
  cotacao,
  itens,
}: {
  solicitacaoId: string;
  cotacao: any;
  itens: any[];
}) {
  const [state, action] = useActionState(validarCotacao, {});
  const extracao = cotacao.extracao_ia ?? {};
  const extractedItens = extracao.itens ?? [];

  const [naoCotados, setNaoCotados] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      itens.map((item: any, index: number) => [
        index,
        !matchExtractedItem(item, extractedItens),
      ]),
    ),
  );
  const [totaisPorItem, setTotaisPorItem] = useState<Record<number, number>>(
    {},
  );

  const totalGeral = Object.values(totaisPorItem).reduce(
    (soma, valor) => soma + valor,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Revisar cotação —{" "}
          {cotacao.fornecedor?.nome_fantasia ??
            cotacao.fornecedor?.razao_social}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
          <input type="hidden" name="cotacao_id" value={cotacao.id} />

          {/* Tabela vira lista de blocos no mobile via CSS (mesmos inputs,
              sem duplicar "name" — os campos ficam num único <form>). */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="block w-full text-sm md:table">
              <thead className="hidden bg-secondary md:table-header-group">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Qtd.</th>
                  <th className="px-3 py-2 text-left">
                    Valor unitário ou total (extraído por IA — confira)
                  </th>
                  <th className="px-3 py-2 text-left">Não cotado</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {itens.map((item: any, index: number) => {
                  const matched = matchExtractedItem(item, extractedItens);
                  return (
                    <tr
                      key={item.id}
                      className="block space-y-3 border-t border-border p-4 md:table-row md:space-y-0 md:p-0"
                    >
                      <td className="block md:table-cell md:px-3 md:py-2">
                        <input
                          type="hidden"
                          name={`cotacao_item_${index}_solicitacao_item_id`}
                          value={item.id}
                        />
                        <input
                          type="hidden"
                          name={`cotacao_item_${index}_incluir`}
                          value="on"
                        />
                        <input
                          type="hidden"
                          name={`cotacao_item_${index}_quantidade`}
                          value={item.quantidade}
                        />
                        <div className="font-medium">{item.descricao}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.unidade}
                        </div>
                      </td>
                      <td className="block text-sm text-muted-foreground md:table-cell md:px-3 md:py-2 md:text-foreground">
                        <span className="md:hidden">Qtd.: </span>
                        {Number(item.quantidade).toLocaleString("pt-BR")}
                      </td>
                      <td className="block md:table-cell md:px-3 md:py-2">
                        <ValorUnitarioTotalInput
                          id={`cotacao_item_${index}_valor_unitario`}
                          name={`cotacao_item_${index}_valor_unitario`}
                          quantidade={Number(item.quantidade)}
                          disabled={naoCotados[index]}
                          defaultValorUnitario={matched?.valor_unitario ?? null}
                          onTotalChange={(total) =>
                            setTotaisPorItem((prev) => ({
                              ...prev,
                              [index]: total,
                            }))
                          }
                        />
                      </td>
                      <td className="block md:table-cell md:px-3 md:py-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name={`cotacao_item_${index}_nao_cotado`}
                            className="size-4 rounded border"
                            checked={naoCotados[index] ?? false}
                            onChange={(event) =>
                              setNaoCotados((prev) => ({
                                ...prev,
                                [index]: event.target.checked,
                              }))
                            }
                          />
                          Não cotado
                        </label>
                      </td>
                      <td className="block md:table-cell md:px-3 md:py-2">
                        <Label
                          htmlFor={`cotacao_item_${index}_observacao`}
                          className="md:hidden"
                        >
                          Observação
                        </Label>
                        <Input
                          id={`cotacao_item_${index}_observacao`}
                          name={`cotacao_item_${index}_observacao`}
                          defaultValue={matched?.observacao ?? ""}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm font-medium">
            <span>Total do orçamento</span>
            <span>
              R${" "}
              {totalGeral.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <FormToast message={state.message} />
          <Button type="submit">Confirmar valores</Button>
        </form>
      </CardContent>
    </Card>
  );
}
