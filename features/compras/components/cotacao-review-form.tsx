"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validarCotacao } from "@/features/compras/actions/purchase-actions";

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function matchExtractedItem(descricao: string, extractedItens: any[]) {
  const normalizedDescricao = normalize(descricao);
  return extractedItens.find((item: any) => {
    const normalizedExtracted = normalize(String(item.descricao ?? ""));
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

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`frete-${cotacao.id}`}>Frete</Label>
              <Input
                id={`frete-${cotacao.id}`}
                name="frete"
                inputMode="decimal"
                defaultValue={extracao.frete ?? cotacao.frete ?? ""}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`prazo-${cotacao.id}`}>Prazo (dias)</Label>
              <Input
                id={`prazo-${cotacao.id}`}
                name="prazo_dias"
                inputMode="numeric"
                defaultValue={extracao.prazo_dias ?? cotacao.prazo_dias ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pagamento-${cotacao.id}`}>
                Forma de pagamento
              </Label>
              <Input
                id={`pagamento-${cotacao.id}`}
                name="forma_pagamento"
                defaultValue={
                  extracao.forma_pagamento ?? cotacao.forma_pagamento ?? ""
                }
              />
            </div>
          </div>

          {/* Tabela vira lista de blocos no mobile via CSS (mesmos inputs,
              sem duplicar "name" — os campos ficam num único <form>). */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="block w-full text-sm md:table">
              <thead className="hidden bg-secondary md:table-header-group">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Qtd.</th>
                  <th className="px-3 py-2 text-left">
                    Valor unitário (extraído por IA — confira)
                  </th>
                  <th className="px-3 py-2 text-left">Não cotado</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {itens.map((item: any, index: number) => {
                  const matched = matchExtractedItem(
                    item.descricao,
                    extractedItens,
                  );
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
                        <Label
                          htmlFor={`cotacao_item_${index}_valor_unitario`}
                          className="md:hidden"
                        >
                          Valor unitário (extraído por IA — confira)
                        </Label>
                        <Input
                          id={`cotacao_item_${index}_valor_unitario`}
                          name={`cotacao_item_${index}_valor_unitario`}
                          inputMode="decimal"
                          placeholder="0,00"
                          defaultValue={matched?.valor_unitario ?? ""}
                        />
                      </td>
                      <td className="block md:table-cell md:px-3 md:py-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name={`cotacao_item_${index}_nao_cotado`}
                            className="size-4 rounded border"
                            defaultChecked={!matched}
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
