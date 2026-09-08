"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  confirmarDevolucaoFerramentaLocada,
  confirmarEntregaFerramentaLocada,
  marcarMensagemFerramentaEnviada,
} from "@/features/ferramentas/actions";
import { ferramentaLocacaoMessage, waLink } from "@/services/whatsapp-service";

type Fornecedor = {
  whatsapp: string | null;
  telefone: string | null;
} | null;

// Mesma lógica da caçamba: enviar a mensagem marca mensagem_enviada_em, o
// que libera "Confirmar entrega" no servidor (o gate está em
// confirmarEntregaFerramentaLocada). Depois de entregue, vira "Confirmar
// devolução".
export function FerramentaLocacaoAcoes({
  ferramentaId,
  ferramentaNome,
  obraNome,
  obraEndereco,
  fornecedor,
  mensagemEnviadaEm,
  entregueEm,
}: {
  ferramentaId: string;
  ferramentaNome: string;
  obraNome: string;
  obraEndereco: string | null;
  fornecedor: Fornecedor;
  mensagemEnviadaEm: string | null;
  entregueEm: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const telefone = fornecedor?.whatsapp ?? fornecedor?.telefone;

  function handleEnviar() {
    window.open(
      waLink(
        telefone,
        ferramentaLocacaoMessage({
          ferramenta: ferramentaNome,
          obra: obraNome,
          endereco: obraEndereco,
        }),
      ),
      "_blank",
      "noopener,noreferrer",
    );
    startTransition(() => {
      marcarMensagemFerramentaEnviada(ferramentaId);
    });
  }

  if (entregueEm) {
    return (
      <form action={confirmarDevolucaoFerramentaLocada}>
        <input type="hidden" name="ferramenta_id" value={ferramentaId} />
        <Button type="submit" size="sm" variant="outline">
          Confirmar devolução
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      {telefone ? (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleEnviar}
        >
          Enviar WhatsApp (locação)
        </Button>
      ) : null}
      {mensagemEnviadaEm ? (
        <form action={confirmarEntregaFerramentaLocada}>
          <input type="hidden" name="ferramenta_id" value={ferramentaId} />
          <Button type="submit" size="sm" variant="outline">
            Confirmar entrega
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          Envie a mensagem antes de confirmar a entrega.
        </p>
      )}
    </div>
  );
}
