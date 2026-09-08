"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarCotacao } from "@/features/compras/actions/purchase-actions";
import { ValorUnitarioTotalInput } from "@/features/compras/components/valor-unitario-total-input";

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

  const [incluidos, setIncluidos] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      itensParaCotar.map((_: any, index: number) => [index, true]),
    ),
  );
  const [naoCotados, setNaoCotados] = useState<Record<number, boolean>>({});
  const [totaisPorItem, setTotaisPorItem] = useState<Record<number, number>>(
    {},
  );

  const totalGeral = Object.values(totaisPorItem).reduce(
    (soma, valor) => soma + valor,
    0,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="solicitacao_id" value={solicitacao.id} />
      <div className="space-y-2">
        <Label htmlFor="fornecedor_id">Fornecedor</Label>
        <select
          id="fornecedor_id"
          name="fornecedor_id"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm lg:w-1/2"
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

      {/* Tabela vira lista de blocos no mobile via CSS (mesmos inputs, sem
          duplicar "name" — os campos ficam dentro de um único <form>). */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="block w-full text-sm md:table">
          <thead className="hidden bg-secondary md:table-header-group">
            <tr>
              <th className="px-3 py-2 text-left">Incluir / Item</th>
              <th className="px-3 py-2 text-left">Qtd.</th>
              <th className="px-3 py-2 text-left">Valor unitário ou total</th>
              <th className="px-3 py-2 text-left">Não cotado</th>
              <th className="px-3 py-2 text-left">Observação</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {itensParaCotar.map((item: any, index: number) => {
              const disabled = naoCotados[index] || !incluidos[index];
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
                      name={`cotacao_item_${index}_quantidade`}
                      value={item.quantidadeCotar}
                    />
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name={`cotacao_item_${index}_incluir`}
                        defaultChecked
                        className="mt-0.5 size-4 shrink-0 rounded border"
                        onChange={(event) =>
                          setIncluidos((prev) => ({
                            ...prev,
                            [index]: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        <span className="font-medium">{item.descricao}</span>
                        <div className="text-xs text-muted-foreground">
                          {item.unidade}
                          {item.quantidade_estoque > 0
                            ? ` · ${Number(item.quantidade_estoque).toLocaleString("pt-BR")} já saíram do estoque`
                            : ""}
                        </div>
                      </span>
                    </label>
                  </td>
                  <td className="block text-sm text-muted-foreground md:table-cell md:px-3 md:py-2 md:text-foreground">
                    <span className="md:hidden">Qtd.: </span>
                    {Number(item.quantidadeCotar).toLocaleString("pt-BR")}
                  </td>
                  <td className="block md:table-cell md:px-3 md:py-2">
                    <ValorUnitarioTotalInput
                      id={`cotacao_item_${index}_valor_unitario`}
                      name={`cotacao_item_${index}_valor_unitario`}
                      quantidade={Number(item.quantidadeCotar)}
                      disabled={disabled}
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
                    />
                  </td>
                </tr>
              );
            })}
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

      <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm font-medium">
        <span>Total do orçamento</span>
        <span>
          R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>

      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Registrar orçamento</Button>
    </form>
  );
}
