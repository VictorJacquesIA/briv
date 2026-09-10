import {
  MobileCard,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
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

  const itensPendentes = (solicitacao.itens ?? []).filter(
    (item: any) =>
      Number(item.quantidade) - Number(item.quantidade_estoque ?? 0) > 0,
  );

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
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
            {itensPendentes.map((item: any) => (
              <tr key={item.id} className="border-t">
                <td className="sticky left-0 bg-card px-3 py-2 font-medium">
                  {item.descricao}
                  <div className="text-xs font-normal text-muted-foreground">
                    {Number(item.quantidade).toLocaleString("pt-BR")}{" "}
                    {item.unidade}
                  </div>
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

      <MobileCardList>
        {cotacoes.map((cotacao: any) => (
          <MobileCard key={cotacao.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">
                {cotacao.fornecedor?.nome_fantasia ??
                  cotacao.fornecedor?.razao_social}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Total: R${" "}
                {fornecedorTotal(cotacao).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="space-y-2 border-t border-border pt-2">
              {itensPendentes.map((item: any) => {
                const cotacaoItem = (cotacao.itens ?? []).find(
                  (candidate: any) => candidate.solicitacao_item_id === item.id,
                );
                return (
                  <div key={item.id}>
                    <div className="font-medium">{item.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {Number(item.quantidade).toLocaleString("pt-BR")}{" "}
                      {item.unidade}
                    </div>
                    {!cotacaoItem ? (
                      <span className="text-muted-foreground">—</span>
                    ) : cotacaoItem.item_nao_cotado ? (
                      <span className="text-destructive">item não cotado</span>
                    ) : (
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          Unit.: R${" "}
                          {Number(
                            cotacaoItem?.preco_unitario ?? 0,
                          ).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span>
                          Total: R${" "}
                          {Number(cotacaoItem?.valor_total ?? 0).toLocaleString(
                            "pt-BR",
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </div>
                    )}
                    {cotacaoItem?.observacao ? (
                      <div className="text-xs text-muted-foreground">
                        {cotacaoItem.observacao}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <MobileCardRow label="Pendências">
              {cotacaoPendencias(cotacao).length > 0
                ? cotacaoPendencias(cotacao).join(", ")
                : "Sem pendências informativas"}
            </MobileCardRow>
          </MobileCard>
        ))}
      </MobileCardList>
    </>
  );
}
