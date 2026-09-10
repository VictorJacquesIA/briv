"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      {itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum item para organizar.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {itens.map((item) => {
            const disponivel = item.item_id
              ? (disponibilidade[item.item_id]?.quantidadeAtual ?? 0)
              : 0;
            const maximo = Math.min(Number(item.quantidade), disponivel);

            return (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm"
              >
                <div>
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.unidade}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    Qtd. total
                    <div className="text-sm font-medium text-foreground">
                      {Number(item.quantidade).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div>
                    Disponível em estoque
                    <div className="text-sm font-medium text-foreground">
                      {maximo > 0
                        ? Number(disponivel).toLocaleString("pt-BR")
                        : "Sem estoque"}
                    </div>
                  </div>
                </div>
                {maximo > 0 ? (
                  <div className="space-y-1">
                    <Label htmlFor={`estoque_qtd_${item.id}`}>
                      Retirar do estoque
                    </Label>
                    <Input
                      id={`estoque_qtd_${item.id}`}
                      name={`estoque_qtd_${item.id}`}
                      inputMode="decimal"
                      placeholder="0"
                      defaultValue="0"
                      className="h-9 w-full"
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label htmlFor={`centro_custo_${item.id}`}>
                    Centro de custo
                  </Label>
                  <select
                    id={`centro_custo_${item.id}`}
                    name={`centro_custo_${item.id}`}
                    required
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">Selecione</option>
                    {orcamentoItens.map((orcamentoItem) => (
                      <option key={orcamentoItem.id} value={orcamentoItem.id}>
                        {orcamentoItem.descricao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
