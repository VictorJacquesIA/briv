"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarItensCotacao } from "@/features/compras/actions/purchase-actions";
import { DescontoInput } from "@/features/compras/components/desconto-input";
import { ValorUnitarioTotalInput } from "@/features/compras/components/valor-unitario-total-input";

// Corrige os itens de uma cotação já salva (inclusive validada), sem precisar
// recriá-la do zero. Mesmo padrão de campos do CotacaoForm/CotacaoReviewForm,
// mas pré-preenchido com o que já está gravado. Não adiciona nem remove item
// da cotação — só corrige preço, "não cotado" e observação de cada um.
export function CotacaoEditForm({
  solicitacaoId,
  cotacao,
  itens,
}: {
  solicitacaoId: string;
  cotacao: any;
  itens: any[];
}) {
  const [state, action] = useActionState(editarItensCotacao, {});

  const existentes = new Map<string, any>(
    (cotacao.itens ?? []).map((item: any) => [item.solicitacao_item_id, item]),
  );

  const [naoCotados, setNaoCotados] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      itens.map((item: any, index: number) => [
        index,
        Boolean(existentes.get(item.id)?.item_nao_cotado),
      ]),
    ),
  );
  const [totaisPorItem, setTotaisPorItem] = useState<Record<number, number>>(
    {},
  );
  const [descontoPercentual, setDescontoPercentual] = useState(
    Number(cotacao.desconto_percentual ?? 0),
  );

  const totalGeral = Object.values(totaisPorItem).reduce(
    (soma, valor) => soma + valor,
    0,
  );
  const totalComDesconto = totalGeral * (1 - descontoPercentual / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Corrigir cotação —{" "}
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
              Nenhum item nesta cotação.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {itens.map((item: any, index: number) => {
                const existente = existentes.get(item.id);
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
                    <ValorUnitarioTotalInput
                      id={`cotacao_item_${index}_valor_unitario`}
                      name={`cotacao_item_${index}_valor_unitario`}
                      quantidade={Number(item.quantidade)}
                      disabled={naoCotados[index]}
                      defaultValorUnitario={
                        existente?.preco_unitario != null
                          ? Number(existente.preco_unitario)
                          : null
                      }
                      onTotalChange={(total) =>
                        setTotaisPorItem((prev) => ({
                          ...prev,
                          [index]: total,
                        }))
                      }
                    />
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
                        defaultValue={existente?.observacao ?? ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DescontoInput
            subtotal={totalGeral}
            onDescontoChange={setDescontoPercentual}
          />

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
          <Button type="submit" variant="outline">
            Salvar correção
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
