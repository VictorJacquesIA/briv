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
  const [descontoPercentual, setDescontoPercentual] = useState(0);

  const totalGeral = Object.values(totaisPorItem).reduce(
    (soma, valor) => soma + valor,
    0,
  );
  const totalComDesconto = totalGeral * (1 - descontoPercentual / 100);

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

          {itens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum item para revisar.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {itens.map((item: any, index: number) => {
                const matched = matchExtractedItem(item, extractedItens);
                return (
                  <div
                    key={item.id}
                    className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm"
                  >
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
                    <div>
                      <div className="font-medium">{item.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.unidade}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Qtd.: {Number(item.quantidade).toLocaleString("pt-BR")}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Valor extraído por IA — confira
                      </p>
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
                    </div>
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
                    <div className="space-y-1">
                      <Label htmlFor={`cotacao_item_${index}_observacao`}>
                        Observação
                      </Label>
                      <Input
                        id={`cotacao_item_${index}_observacao`}
                        name={`cotacao_item_${index}_observacao`}
                        defaultValue={matched?.observacao ?? ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="desconto_percentual">Desconto (%)</Label>
            <Input
              id="desconto_percentual"
              name="desconto_percentual"
              inputMode="decimal"
              placeholder="0"
              onChange={(event) => {
                const parsed = Number(event.target.value.replace(",", "."));
                setDescontoPercentual(Number.isFinite(parsed) ? parsed : 0);
              }}
            />
          </div>

          <div className="space-y-1 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>
                R${" "}
                {totalGeral.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span>Total {descontoPercentual > 0 ? "com desconto" : ""}</span>
              <span>
                R${" "}
                {totalComDesconto.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
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
