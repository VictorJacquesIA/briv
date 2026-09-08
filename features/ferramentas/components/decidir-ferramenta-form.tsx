"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import {
  decidirFerramentaDeposito,
  decidirFerramentaLocacao,
  marcarMensagemLocacaoSolicitacaoEnviada,
} from "@/features/ferramentas/actions";
import { ferramentaLocacaoMessage, waLink } from "@/services/whatsapp-service";

type FerramentaDisponivel = { id: string; nome: string; codigo: string | null };
type Fornecedor = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  whatsapp: string | null;
  telefone: string | null;
};

export function DecidirFerramentaForm({
  solicitacaoId,
  descricao,
  obraNome,
  obraEndereco,
  periodoUso,
  dataNecessidade,
  fornecedorId,
  mensagemEnviadaEm,
  ferramentasDisponiveis,
  fornecedores,
}: {
  solicitacaoId: string;
  descricao: string;
  obraNome: string;
  obraEndereco: string | null;
  periodoUso: string | null;
  dataNecessidade: string | null;
  fornecedorId: string | null;
  mensagemEnviadaEm: string | null;
  ferramentasDisponiveis: FerramentaDisponivel[];
  fornecedores: Fornecedor[];
}) {
  const [modo, setModo] = useState<"deposito" | "locacao" | null>(
    mensagemEnviadaEm ? "locacao" : null,
  );
  const [fornecedorEscolhido, setFornecedorEscolhido] = useState(
    fornecedorId ?? "",
  );
  const [isPendingMensagem, startTransitionMensagem] = useTransition();
  const [depositoState, depositoAction] = useActionState(
    decidirFerramentaDeposito,
    {},
  );
  const [locacaoState, locacaoAction] = useActionState(
    decidirFerramentaLocacao,
    {},
  );

  function handleEnviarMensagemLocacao() {
    if (!fornecedorEscolhido) {
      return;
    }
    const fornecedor = fornecedores.find((f) => f.id === fornecedorEscolhido);
    const telefone = fornecedor?.whatsapp ?? fornecedor?.telefone;
    if (telefone) {
      window.open(
        waLink(
          telefone,
          ferramentaLocacaoMessage({
            ferramenta: descricao,
            obra: obraNome,
            endereco: obraEndereco,
            periodoUso,
            dataNecessidade,
          }),
        ),
        "_blank",
        "noopener,noreferrer",
      );
    }
    startTransitionMensagem(() => {
      marcarMensagemLocacaoSolicitacaoEnviada(
        solicitacaoId,
        fornecedorEscolhido,
      );
    });
  }

  if (!modo) {
    return (
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setModo("deposito")}
        >
          Enviar do depósito
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setModo("locacao")}
        >
          Locar de fornecedor
        </Button>
      </div>
    );
  }

  if (modo === "deposito") {
    return (
      <form action={depositoAction} className="flex flex-col gap-2 sm:max-w-xs">
        <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
        <select
          name="ferramenta_id"
          required
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
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
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="flex-1">
            Confirmar envio
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => setModo(null)}
          >
            Cancelar
          </Button>
        </div>
        <FormToast message={depositoState.message} />
      </form>
    );
  }

  // Sem mensagem enviada ainda: escolhe o fornecedor e manda o WhatsApp com
  // o pedido antes de confirmar qualquer termo da locação.
  if (!mensagemEnviadaEm) {
    return (
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <select
          value={fornecedorEscolhido}
          onChange={(event) => setFornecedorEscolhido(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Fornecedor</option>
          {fornecedores.map((fornecedor) => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome_fantasia ?? fornecedor.razao_social}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={!fornecedorEscolhido || isPendingMensagem}
            onClick={handleEnviarMensagemLocacao}
          >
            Enviar WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => setModo(null)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Mensagem já enviada pro fornecedor: só falta confirmar os termos e a
  // entrega da ferramenta locada.
  const fornecedorAtual = fornecedores.find(
    (fornecedor) => fornecedor.id === fornecedorId,
  );

  return (
    <form action={locacaoAction} className="flex flex-col gap-2 sm:max-w-xs">
      <input type="hidden" name="solicitacao_id" value={solicitacaoId} />
      {fornecedorAtual ? (
        <p className="text-xs text-muted-foreground">
          Fornecedor:{" "}
          {fornecedorAtual.nome_fantasia ?? fornecedorAtual.razao_social}
        </p>
      ) : null}
      <input
        type="number"
        step="0.01"
        name="valor_locacao"
        placeholder="Valor"
        aria-label="Valor da locação"
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      />
      <input
        type="date"
        name="data_prevista_devolucao"
        required
        aria-label="Data prevista de devolução"
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      />
      <Button type="submit" size="sm" className="w-full">
        Confirmar entrega
      </Button>
      <FormToast message={locacaoState.message} />
    </form>
  );
}
