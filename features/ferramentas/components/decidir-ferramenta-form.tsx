"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import {
  decidirFerramentaDeposito,
  decidirFerramentaLocacao,
} from "@/features/ferramentas/actions";

type FerramentaDisponivel = { id: string; nome: string; codigo: string | null };
type Fornecedor = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
};

export function DecidirFerramentaForm({
  solicitacaoId,
  ferramentasDisponiveis,
  fornecedores,
}: {
  solicitacaoId: string;
  ferramentasDisponiveis: FerramentaDisponivel[];
  fornecedores: Fornecedor[];
}) {
  const [modo, setModo] = useState<"deposito" | "locacao" | null>(null);
  const [depositoState, depositoAction] = useActionState(
    decidirFerramentaDeposito,
    {},
  );
  const [locacaoState, locacaoAction] = useActionState(
    decidirFerramentaLocacao,
    {},
  );

  if (!modo) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setModo("deposito")}
        >
          Enviar do depósito
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setModo("locacao")}
        >
          Locar de fornecedor
        </Button>
      </div>
    );
  }

  if (modo === "deposito") {
    return (
      <form
        action={depositoAction}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
        <select
          name="ferramenta_id"
          required
          className="h-9 rounded-md border bg-background px-2 text-sm"
          defaultValue=""
        >
          <option value="">Selecione a ferramenta</option>
          {ferramentasDisponiveis.map((ferramenta) => (
            <option key={ferramenta.id} value={ferramenta.id}>
              {ferramenta.nome}
              {ferramenta.codigo ? ` (${ferramenta.codigo})` : ""}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Confirmar envio
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setModo(null)}
        >
          Cancelar
        </Button>
        <FormToast message={depositoState.message} />
      </form>
    );
  }

  return (
    <form action={locacaoAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
      <select
        name="fornecedor_id"
        required
        className="h-9 rounded-md border bg-background px-2 text-sm"
        defaultValue=""
      >
        <option value="">Fornecedor</option>
        {fornecedores.map((fornecedor) => (
          <option key={fornecedor.id} value={fornecedor.id}>
            {fornecedor.nome_fantasia ?? fornecedor.razao_social}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        name="valor_locacao"
        placeholder="Valor"
        aria-label="Valor da locação"
        className="h-9 w-28 rounded-md border bg-background px-2 text-sm"
      />
      <input
        type="date"
        name="data_prevista_devolucao"
        required
        aria-label="Data prevista de devolução"
        className="h-9 rounded-md border bg-background px-2 text-sm"
      />
      <Button type="submit" size="sm">
        Confirmar locação
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setModo(null)}
      >
        Cancelar
      </Button>
      <FormToast message={locacaoState.message} />
    </form>
  );
}
