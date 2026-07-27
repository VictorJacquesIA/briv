import { cotacaoPendencias, fornecedorTotal } from "@/services/compras-service";

export function Comparativo({ solicitacao }: { solicitacao: any }) {
  const cotacoes = solicitacao.cotacoes ?? [];

  if (cotacoes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum orçamento registrado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="sticky left-0 bg-secondary px-3 py-2 text-left">
              Item
            </th>
            {cotacoes.map((cotacao: any) => (
              <th key={cotacao.id} className="px-3 py-2 text-left align-top">
                <div className="font-semibold">
                  {cotacao.fornecedor?.nome_fantasia ??
                    cotacao.fornecedor?.razao_social}
                </div>
                <div className="mt-1 text-xs font-normal text-muted-foreground">
                  Total: R${" "}
                  {fornecedorTotal(cotacao).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(solicitacao.itens ?? [])
            .filter(
              (item: any) =>
                Number(item.quantidade) - Number(item.quantidade_estoque ?? 0) >
                0,
            )
            .map((item: any) => (
              <tr key={item.id} className="border-t">
                <td className="sticky left-0 bg-card px-3 py-2 font-medium">
                  {item.descricao}
                </td>
                {cotacoes.map((cotacao: any) => {
                  const cotacaoItem = (cotacao.itens ?? []).find(
                    (candidate: any) =>
                      candidate.solicitacao_item_id === item.id,
                  );
                  return (
                    <td key={cotacao.id} className="px-3 py-2 align-top">
                      {!cotacaoItem ? (
                        <span className="text-muted-foreground">—</span>
                      ) : cotacaoItem.item_nao_cotado ? (
                        <span className="text-destructive">
                          item não cotado
                        </span>
                      ) : (
                        <>
                          <div>
                            Unit.: R${" "}
                            {Number(
                              cotacaoItem?.preco_unitario ?? 0,
                            ).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <div>
                            Total: R${" "}
                            {Number(
                              cotacaoItem?.valor_total ?? 0,
                            ).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </>
                      )}
                      {cotacaoItem?.observacao ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {cotacaoItem.observacao}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          <tr className="border-t border-border bg-secondary/60">
            <td className="sticky left-0 bg-secondary px-3 py-2 font-medium">
              Pendências
            </td>
            {cotacoes.map((cotacao: any) => (
              <td key={cotacao.id} className="px-3 py-2">
                {cotacaoPendencias(cotacao).length > 0
                  ? cotacaoPendencias(cotacao).join(", ")
                  : "Sem pendências informativas"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
