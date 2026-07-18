import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmarSeparacao } from "@/features/estoque/actions";

type RequisicaoItem = {
  id: string;
  quantidade_solicitada: number;
  solicitacao_item: { descricao: string; unidade: string } | null;
};

export function ConfirmarSeparacaoForm({
  requisicaoId,
  itens,
}: {
  requisicaoId: string;
  itens: RequisicaoItem[];
}) {
  return (
    <form action={confirmarSeparacao} className="space-y-4" data-no-print>
      <input type="hidden" name="requisicao_id" value={requisicaoId} />
      <div className="space-y-3">
        {itens.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <div className="font-medium">
                {item.solicitacao_item?.descricao}
              </div>
              <div className="text-xs text-muted-foreground">
                Solicitado:{" "}
                {Number(item.quantidade_solicitada).toLocaleString("pt-BR")}{" "}
                {item.solicitacao_item?.unidade}
              </div>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor={`quantidade_separada_${item.id}`}
                className="text-xs"
              >
                Quantidade separada
              </Label>
              <Input
                id={`quantidade_separada_${item.id}`}
                name={`quantidade_separada_${item.id}`}
                inputMode="decimal"
                defaultValue={item.quantidade_solicitada}
                className="h-9 w-28"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Se a quantidade separada for menor que a solicitada, o Compras é avisado
        da diferença na tela da solicitação.
      </p>
      <Button type="submit" className="w-full">
        Confirmar separação
      </Button>
    </form>
  );
}
