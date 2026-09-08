"use client";

import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
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

// A mensagem já foi enviada na escolha do fornecedor (decidirFerramentaLocacao
// carrega mensagem_enviada_em pra ferramenta), por isso chega aqui como
// "Entrega agendada" com "Confirmar entrega" liberado — o botão de WhatsApp
// fica disponível só como reenvio. O gate server-side continua em
// confirmarEntregaFerramentaLocada. Depois de entregue, vira "Confirmar
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
      <form action={confirmarDevolucaoFerramentaLocada} className="sm:max-w-xs">
        <input type="hidden" name="ferramenta_id" value={ferramentaId} />
        <Button type="submit" size="sm" variant="outline" className="w-full">
          Confirmar devolução
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-2 sm:max-w-xs">
      <Badge variant="secondary">Entrega agendada</Badge>
      {telefone ? (
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={isPending}
          onClick={handleEnviar}
        >
          Reenviar WhatsApp (locação)
        </Button>
      ) : null}
      {mensagemEnviadaEm ? (
        <form action={confirmarEntregaFerramentaLocada}>
          <input type="hidden" name="ferramenta_id" value={ferramentaId} />
          <Button type="submit" size="sm" variant="outline" className="w-full">
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
