"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

type CotacaoItem = {
  solicitacao_item_id: string;
  preco_unitario: number | null;
  valor_total: number | null;
  item_nao_cotado: boolean | null;
};

type Cotacao = {
  fornecedor_id: string;
  fornecedor?: {
    nome_fantasia?: string | null;
    razao_social?: string | null;
  } | null;
  itens?: CotacaoItem[] | null;
};

type Item = {
  id: string;
  descricao: string;
  quantidade: number;
  quantidade_estoque?: number | null;
  unidade?: string | null;
};

function quantidadeLabel(item: Item) {
  return `${Number(item.quantidade).toLocaleString("pt-BR")} ${item.unidade ?? ""}`.trim();
}

function fornecedorNome(cotacao: Cotacao) {
  return (
    cotacao.fornecedor?.nome_fantasia ??
    cotacao.fornecedor?.razao_social ??
    "Fornecedor"
  );
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function cotacaoItemValido(cotacao: Cotacao, itemId: string) {
  const item = (cotacao.itens ?? []).find(
    (candidate) => candidate.solicitacao_item_id === itemId,
  );
  return item && !item.item_nao_cotado && item.preco_unitario != null
    ? item
    : null;
}

export function AprovacaoDecisao({
  token,
  solicitacaoId,
  itens,
  cotacoes,
  action,
}: {
  token: string;
  solicitacaoId: string;
  itens: Item[];
  cotacoes: Cotacao[];
  action: (formData: FormData) => void;
}) {
  const itensPendentes = useMemo(
    () =>
      itens.filter(
        (item) =>
          Number(item.quantidade) - Number(item.quantidade_estoque ?? 0) > 0,
      ),
    [itens],
  );

  const itensSemCotacao = itensPendentes.filter(
    (item) => !cotacoes.some((cotacao) => cotacaoItemValido(cotacao, item.id)),
  );
  const itensAssignaveis = itensPendentes.filter(
    (item) => !itensSemCotacao.some((semCotacao) => semCotacao.id === item.id),
  );

  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [roundFornecedorId, setRoundFornecedorId] = useState<string>("");
  const [roundChecked, setRoundChecked] = useState<Record<string, boolean>>({});

  const restantes = itensAssignaveis.filter((item) => !assignments[item.id]);
  const completo = restantes.length === 0 && itensAssignaveis.length > 0;

  const fornecedoresDisponiveis = cotacoes.filter((cotacao) =>
    restantes.some((item) => cotacaoItemValido(cotacao, item.id)),
  );

  const rodadaFornecedor = cotacoes.find(
    (cotacao) => cotacao.fornecedor_id === roundFornecedorId,
  );
  const rodadaItens = rodadaFornecedor
    ? restantes.filter((item) => cotacaoItemValido(rodadaFornecedor, item.id))
    : [];

  function iniciarRodada(fornecedorId: string) {
    const cotacao = cotacoes.find((c) => c.fornecedor_id === fornecedorId);
    const checked: Record<string, boolean> = {};
    for (const item of restantes) {
      if (cotacao && cotacaoItemValido(cotacao, item.id)) {
        checked[item.id] = true;
      }
    }
    setRoundFornecedorId(fornecedorId);
    setRoundChecked(checked);
  }

  function confirmarRodada() {
    const novos = { ...assignments };
    for (const [itemId, isChecked] of Object.entries(roundChecked)) {
      if (isChecked) {
        novos[itemId] = roundFornecedorId;
      }
    }
    setAssignments(novos);
    setRoundFornecedorId("");
    setRoundChecked({});
  }

  function removerAtribuicao(itemId: string) {
    const novos = { ...assignments };
    delete novos[itemId];
    setAssignments(novos);
  }

  const resumoPorFornecedor = useMemo(() => {
    const grupos = new Map<
      string,
      { cotacao: Cotacao; itens: Item[]; total: number }
    >();
    for (const item of itensAssignaveis) {
      const fornecedorId = assignments[item.id];
      if (!fornecedorId) {
        continue;
      }
      const cotacao = cotacoes.find((c) => c.fornecedor_id === fornecedorId);
      if (!cotacao) {
        continue;
      }
      const grupo = grupos.get(fornecedorId) ?? {
        cotacao,
        itens: [] as Item[],
        total: 0,
      };
      grupo.itens.push(item);
      grupo.total += Number(
        cotacaoItemValido(cotacao, item.id)?.valor_total ?? 0,
      );
      grupos.set(fornecedorId, grupo);
    }
    return [...grupos.values()];
  }, [assignments, itensAssignaveis, cotacoes]);

  const assignmentsJson = JSON.stringify(
    Object.entries(assignments).map(([solicitacao_item_id, fornecedor_id]) => ({
      solicitacao_item_id,
      fornecedor_id,
    })),
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
      <input
        type="hidden"
        name="assignments"
        value={assignmentsJson}
        readOnly
      />

      {itensSemCotacao.length > 0 ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {itensSemCotacao.length}{" "}
          {itensSemCotacao.length > 1 ? "itens" : "item"} sem cotação válida de
          nenhum fornecedor:{" "}
          {itensSemCotacao.map((item) => item.descricao).join(", ")}.{" "}
          {itensSemCotacao.length > 1 ? "Eles" : "Ele"} não poder
          {itensSemCotacao.length > 1 ? "ão" : "á"} ser incluíd
          {itensSemCotacao.length > 1 ? "os" : "o"} no pedido.
        </div>
      ) : null}

      {resumoPorFornecedor.length > 0 ? (
        <div className="space-y-3 rounded-md border border-border bg-secondary/40 p-3">
          <p className="text-sm font-medium">Itens já atribuídos</p>
          {resumoPorFornecedor.map((grupo) => (
            <div key={grupo.cotacao.fornecedor_id} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {fornecedorNome(grupo.cotacao)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Total: R$ {moeda(grupo.total)}
                </span>
              </div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {grupo.itens.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {item.descricao}{" "}
                      <span className="text-muted-foreground">
                        ({quantidadeLabel(item)})
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => removerAtribuicao(item.id)}
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {!completo && !roundFornecedorId ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-sm font-medium">
            {restantes.length} de {itensAssignaveis.length}{" "}
            {itensAssignaveis.length > 1 ? "itens restam" : "item resta"} para
            atribuir
          </p>
          {fornecedoresDisponiveis.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Escolha um fornecedor para esta rodada:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {fornecedoresDisponiveis.map((cotacao) => (
                  <Button
                    key={cotacao.fornecedor_id}
                    type="button"
                    variant="outline"
                    onClick={() => iniciarRodada(cotacao.fornecedor_id)}
                  >
                    {fornecedorNome(cotacao)}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!completo && roundFornecedorId && rodadaFornecedor ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-sm font-medium">
            Itens de {fornecedorNome(rodadaFornecedor)} — desmarque os que não
            forem para este fornecedor
          </p>
          <div className="space-y-2">
            {rodadaItens.map((item) => {
              const cotacaoItem = cotacaoItemValido(rodadaFornecedor, item.id)!;
              return (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!roundChecked[item.id]}
                      onChange={(event) =>
                        setRoundChecked((prev) => ({
                          ...prev,
                          [item.id]: event.target.checked,
                        }))
                      }
                    />
                    {item.descricao}{" "}
                    <span className="text-muted-foreground">
                      ({quantidadeLabel(item)})
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    R$ {moeda(Number(cotacaoItem.valor_total ?? 0))}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={confirmarRodada}>
              Confirmar itens deste fornecedor
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRoundFornecedorId("");
                setRoundChecked({});
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="gestor_nome"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          placeholder="Nome do gestor"
          defaultValue="Mateus"
          required
        />
        <input
          name="gestor_email"
          type="email"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          placeholder="E-mail do gestor"
        />
      </div>
      <input
        name="prazo_pagamento"
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        placeholder="Prazo de pagamento (ex: 30 dias, 3x sem juros)"
      />
      <textarea
        name="comentario"
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Comentario"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <ConfirmSubmitButton
          type="submit"
          name="decisao"
          value="autorizar"
          message="Confirmar autorização desta compra?"
          disabled={!completo}
        >
          {resumoPorFornecedor.length > 1
            ? "Autorizar fornecedores"
            : "Autorizar fornecedor"}
        </ConfirmSubmitButton>
        <ConfirmSubmitButton
          type="submit"
          name="decisao"
          value="recusar"
          variant="destructive"
          message="Confirmar recusa desta solicitação?"
        >
          Recusar solicitação
        </ConfirmSubmitButton>
      </div>
    </form>
  );
}
