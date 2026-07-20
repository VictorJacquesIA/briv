"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createColaboradorGestor,
  createLancamento,
} from "@/features/pagamento-mo/actions/mo-actions";

type OrcamentoItem = { id: string; descricao: string };
type Contrato = {
  id: string;
  descricao: string;
  colaboradorNome: string;
  saldoRestante: number;
};

export function LancamentoForm({
  obras,
  colaboradores,
  orcamentoItensByObra,
  contratosByObra,
  isGestor,
}: {
  obras: Array<{ id: string; nome: string }>;
  colaboradores: Array<{ id: string; nome: string }>;
  orcamentoItensByObra: Record<string, OrcamentoItem[]>;
  contratosByObra: Record<string, Contrato[]>;
  isGestor: boolean;
}) {
  const [state, action] = useActionState(createLancamento, {});
  const [obraId, setObraId] = useState("");
  const [tipo, setTipo] = useState("solicitacao");
  const [usarDiarias, setUsarDiarias] = useState(false);
  const [localColaboradores, setLocalColaboradores] = useState(colaboradores);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState("");
  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [showNovoPrestador, setShowNovoPrestador] = useState(false);
  const [prestadorState, prestadorAction] = useActionState(
    createColaboradorGestor,
    {},
  );
  const orcamentoItens = useMemo(
    () => orcamentoItensByObra[obraId] ?? [],
    [obraId, orcamentoItensByObra],
  );
  const contratosDisponiveis = useMemo(
    () => contratosByObra[obraId] ?? [],
    [obraId, contratosByObra],
  );
  const contratoSelecionado = useMemo(
    () => contratosDisponiveis.find((c) => c.id === selectedContratoId),
    [contratosDisponiveis, selectedContratoId],
  );
  const colaboradorLabel = "Colaborador/Prestador";

  // Diárias e centro de custo só existem pro tipo "solicitacao" (pagamento
  // de mão de obra); o gestor nunca define valor da diária nem centro de
  // custo — isso fica pro compras/adm preencher na confirmação. "contrato"
  // é um tipo só de UI (sempre vira tipo='solicitacao' no banco, com
  // contrato_id) — também nunca define centro de custo aqui, isso continua
  // pro compras/adm preencher na confirmação do pagamento.
  const isSolicitacao = tipo === "solicitacao";
  const isContrato = tipo === "contrato";
  const showDiariasFields = isSolicitacao && usarDiarias;
  const showCentroCustoSelect = isSolicitacao && !isGestor;
  const showCentroCustoNote = isSolicitacao && isGestor;

  useEffect(() => {
    setSelectedContratoId("");
  }, [obraId, tipo]);

  useEffect(() => {
    if (prestadorState.id && prestadorState.nome) {
      setLocalColaboradores((prev) => [
        ...prev,
        { id: prestadorState.id!, nome: prestadorState.nome! },
      ]);
      setSelectedColaboradorId(prestadorState.id);
      setShowNovoPrestador(false);
    }
  }, [prestadorState]);

  return (
    <>
      <form
        id="novo-prestador-form"
        action={prestadorAction}
        className="hidden"
        aria-hidden="true"
      />
      <form action={action} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="obra_id">Obra</Label>
            <select
              id="obra_id"
              name="obra_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              value={obraId}
              onChange={(event) => setObraId(event.target.value)}
            >
              <option value="">Selecione</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {isContrato ? (
              <>
                <Label htmlFor="contrato_id">Contrato</Label>
                <select
                  id="contrato_id"
                  name="contrato_id"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  disabled={!obraId}
                  value={selectedContratoId}
                  onChange={(event) =>
                    setSelectedContratoId(event.target.value)
                  }
                >
                  <option value="">
                    {obraId ? "Selecione" : "Selecione a obra primeiro"}
                  </option>
                  {contratosDisponiveis.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.colaboradorNome} — {contrato.descricao}
                    </option>
                  ))}
                </select>
                {obraId && contratosDisponiveis.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum contrato em aberto nesta obra.
                  </p>
                ) : null}
                {contratoSelecionado ? (
                  <p className="text-xs text-muted-foreground">
                    Saldo restante: R${" "}
                    {contratoSelecionado.saldoRestante.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <Label htmlFor="colaborador_id">{colaboradorLabel}</Label>
                <select
                  id="colaborador_id"
                  name="colaborador_id"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  value={selectedColaboradorId}
                  onChange={(event) =>
                    setSelectedColaboradorId(event.target.value)
                  }
                >
                  <option value="">Selecione</option>
                  {localColaboradores.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome}
                    </option>
                  ))}
                </select>
                {isGestor ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="text-sm text-primary underline"
                      onClick={() => setShowNovoPrestador((prev) => !prev)}
                    >
                      {showNovoPrestador
                        ? "Cancelar"
                        : "Cadastrar novo prestador"}
                    </button>
                    {showNovoPrestador ? (
                      <div className="space-y-2 rounded-md border p-3">
                        <Input
                          name="nome"
                          placeholder="Nome do prestador"
                          form="novo-prestador-form"
                        />
                        <Input
                          name="chave_pix"
                          placeholder="Chave Pix"
                          form="novo-prestador-form"
                        />
                        <Input
                          name="dados_bancarios"
                          placeholder="Dados bancários"
                          form="novo-prestador-form"
                        />
                        {prestadorState.message ? (
                          <p className="text-sm text-muted-foreground">
                            {prestadorState.message}
                          </p>
                        ) : null}
                        <Button
                          type="submit"
                          form="novo-prestador-form"
                          variant="outline"
                          size="sm"
                        >
                          Salvar prestador
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              name="tipo"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
            >
              <option value="solicitacao">Pagamento de mão de obra</option>
              <option value="reembolso">Reembolso</option>
              <option value="vale">Adiantamento (vale)</option>
              <option value="contrato">Pagamento de contrato</option>
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="valor">Valor</Label>
              {isSolicitacao ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={usarDiarias}
                    onChange={(event) => setUsarDiarias(event.target.checked)}
                  />
                  Lançar por diárias
                </label>
              ) : null}
            </div>
            {showDiariasFields ? (
              <div
                className={
                  isGestor ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"
                }
              >
                <div className="space-y-2">
                  <Label htmlFor="qtd_diarias">Diárias</Label>
                  <select
                    id="qtd_diarias"
                    name="qtd_diarias"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    required
                    defaultValue=""
                  >
                    <option value="">Selecione</option>
                    {Array.from({ length: 50 }, (_, index) => index + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ),
                    )}
                  </select>
                  {isGestor ? (
                    <p className="text-xs text-muted-foreground">
                      O valor da diária é preenchido pelo compras/adm ao
                      confirmar o pagamento.
                    </p>
                  ) : null}
                </div>
                {isGestor ? null : (
                  <div className="space-y-2">
                    <Label htmlFor="valor_diaria">Valor da diária</Label>
                    <Input
                      id="valor_diaria"
                      name="valor_diaria"
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                )}
              </div>
            ) : (
              <Input
                id="valor"
                name="valor"
                inputMode="decimal"
                placeholder="0,00"
                required
              />
            )}
          </div>
          {showCentroCustoSelect ? (
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="orcamento_item_id">Centro de custo</Label>
              <select
                id="orcamento_item_id"
                name="orcamento_item_id"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
                disabled={!obraId}
              >
                <option value="">
                  {obraId ? "Selecione" : "Selecione a obra primeiro"}
                </option>
                {orcamentoItens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.descricao}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {showCentroCustoNote ? (
            <p className="text-xs text-muted-foreground lg:col-span-2">
              O centro de custo é definido pelo compras/adm ao confirmar o
              pagamento.
            </p>
          ) : null}
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" name="descricao" />
          </div>
        </div>
        {state.message ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : null}
        <FormToast message={state.message} />
        <Button type="submit">Lançar</Button>
      </form>
    </>
  );
}
