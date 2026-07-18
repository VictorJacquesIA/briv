"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { decidirEstoqueSolicitacao } from "@/features/compras/actions/purchase-actions";

type Item = {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  item_id: string | null;
};

type OrcamentoItem = { id: string; descricao: string };

type Disponibilidade = Record<
  string,
  { estoqueItemId: string; quantidadeAtual: number }
>;

export function EstoqueDecisionForm({
  solicitacaoId,
  itens,
  disponibilidade,
  orcamentoItens,
}: {
  solicitacaoId: string;
  itens: Item[];
  disponibilidade: Disponibilidade;
  orcamentoItens: OrcamentoItem[];
}) {
  const [state, action] = useActionState(decidirEstoqueSolicitacao, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
      <p className="text-sm text-muted-foreground">
        Antes de iniciar a cotação, decida quanto de cada item sai do estoque (o
        restante vai para cotação com fornecedores) e defina o centro de custo —
        o gestor não define isso na criação da solicitação.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Qtd. total</th>
              <th className="px-3 py-2 text-left">Disponível em estoque</th>
              <th className="px-3 py-2 text-left">Retirar do estoque</th>
              <th className="px-3 py-2 text-left">Centro de custo</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const disponivel = item.item_id
                ? (disponibilidade[item.item_id]?.quantidadeAtual ?? 0)
                : 0;
              const maximo = Math.min(Number(item.quantidade), disponivel);

              return (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.unidade}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {Number(item.quantidade).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    {maximo > 0
                      ? Number(disponivel).toLocaleString("pt-BR")
                      : "Sem estoque"}
                  </td>
                  <td className="px-3 py-2">
                    {maximo > 0 ? (
                      <Input
                        name={`estoque_qtd_${item.id}`}
                        inputMode="decimal"
                        placeholder="0"
                        defaultValue="0"
                        className="h-9 w-24"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      name={`centro_custo_${item.id}`}
                      required
                      className="h-9 w-full min-w-[160px] rounded-md border bg-background px-2 text-sm"
                      defaultValue=""
                    >
                      <option value="">Selecione</option>
                      {orcamentoItens.map((orcamentoItem) => (
                        <option key={orcamentoItem.id} value={orcamentoItem.id}>
                          {orcamentoItem.descricao}
                        </option>
                      ))}
                    </select>
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
      <Button type="submit" className="w-full">
        Confirmar e liberar cotação
      </Button>
    </form>
  );
}
