"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarCotacao } from "@/features/compras/actions/purchase-actions";

export function CotacaoForm({
  solicitacao,
  fornecedores,
}: {
  solicitacao: any;
  fornecedores: any[];
}) {
  const [state, action] = useActionState(salvarCotacao, {});

  // Itens totalmente cobertos pelo estoque (decisão em "Organizar itens
  // (estoque x cotação)") não vão para cotação — só a parte que sobrou.
  const itensParaCotar = (solicitacao.itens ?? [])
    .map((item: any) => ({
      ...item,
      quantidadeCotar:
        Number(item.quantidade) - Number(item.quantidade_estoque ?? 0),
    }))
    .filter((item: any) => item.quantidadeCotar > 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="solicitacao_id" value={solicitacao.id} />
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="fornecedor_id">Fornecedor</Label>
          <select
            id="fornecedor_id"
            name="fornecedor_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required
          >
            <option value="">Selecione</option>
            {fornecedores.map((fornecedor) => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.nome_fantasia ?? fornecedor.razao_social}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="frete">Frete</Label>
          <Input
            id="frete"
            name="frete"
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prazo_dias">Prazo</Label>
          <Input
            id="prazo_dias"
            name="prazo_dias"
            inputMode="numeric"
            placeholder="dias"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forma_pagamento">Forma de pagamento</Label>
        <Input id="forma_pagamento" name="forma_pagamento" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Qtd.</th>
              <th className="px-3 py-2 text-left">Valor unitário</th>
              <th className="px-3 py-2 text-left">Não cotado</th>
              <th className="px-3 py-2 text-left">Observação</th>
            </tr>
          </thead>
          <tbody>
            {itensParaCotar.map((item: any, index: number) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="hidden"
                    name={`cotacao_item_${index}_solicitacao_item_id`}
                    value={item.id}
                  />
                  <input
                    type="hidden"
                    name={`cotacao_item_${index}_quantidade`}
                    value={item.quantidadeCotar}
                  />
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.unidade}
                    {item.quantidade_estoque > 0
                      ? ` · ${Number(item.quantidade_estoque).toLocaleString("pt-BR")} já saíram do estoque`
                      : ""}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {Number(item.quantidadeCotar).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">
                  <Input
                    name={`cotacao_item_${index}_valor_unitario`}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    name={`cotacao_item_${index}_nao_cotado`}
                    className="size-4 rounded border"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input name={`cotacao_item_${index}_observacao`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes_gerais">Observações gerais</Label>
        <textarea
          id="observacoes_gerais"
          name="observacoes_gerais"
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Registrar orçamento</Button>
    </form>
  );
}
