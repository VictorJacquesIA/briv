"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  confirmarDevolucaoFerramentaLocada,
  confirmarEntregaFerramentaLocada,
} from "@/features/ferramentas/actions";

type FerramentaVencida = {
  id: string;
  nome: string;
  data_prevista_devolucao: string | null;
  mensagem_enviada_em: string | null;
  entregue_em: string | null;
  obra_atual: { nome: string | null } | null;
};

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

const CHAVE_DISPENSADO = "ferramenta-lembrete-dispensado";

// Mesma ideia da caçamba: aparece uma vez por sessão quando há ferramenta
// locada com mensagem não enviada ou devolução vencida.
export function FerramentaLembretePopup({
  ferramentas,
  canConfirm,
}: {
  ferramentas: FerramentaVencida[];
  canConfirm: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ferramentas.length === 0) {
      return;
    }
    try {
      if (sessionStorage.getItem(CHAVE_DISPENSADO)) {
        return;
      }
    } catch {
      // Sem acesso ao sessionStorage — mostra mesmo assim.
    }
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ferramentas.length]);

  function fechar() {
    setOpen(false);
    try {
      sessionStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      // Ignorado — só evita reaparecer nessa mesma sessão.
    }
  }

  if (ferramentas.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => (value ? setOpen(true) : fechar())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ferramentas locadas com ação pendente</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {ferramentas.map((ferramenta) => {
            const precisaMensagem = !ferramenta.mensagem_enviada_em;
            const precisaDevolucao =
              !precisaMensagem && !!ferramenta.entregue_em;

            return (
              <div
                key={ferramenta.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium">{ferramenta.nome}</p>
                <p className="text-muted-foreground">
                  Obra: {ferramenta.obra_atual?.nome ?? "-"}
                </p>
                {precisaMensagem ? (
                  <p className="mt-2 text-xs text-destructive">
                    A mensagem de locação pro fornecedor ainda não foi enviada.
                  </p>
                ) : precisaDevolucao ? (
                  <>
                    <p className="text-muted-foreground">
                      Devolução prevista para{" "}
                      {formatarData(ferramenta.data_prevista_devolucao)}
                    </p>
                    {canConfirm ? (
                      <form
                        action={confirmarDevolucaoFerramentaLocada}
                        className="mt-2"
                      >
                        <input
                          type="hidden"
                          name="ferramenta_id"
                          value={ferramenta.id}
                        />
                        <Button type="submit" size="sm">
                          Confirmar devolução
                        </Button>
                      </form>
                    ) : null}
                  </>
                ) : canConfirm ? (
                  <form
                    action={confirmarEntregaFerramentaLocada}
                    className="mt-2"
                  >
                    <input
                      type="hidden"
                      name="ferramenta_id"
                      value={ferramenta.id}
                    />
                    <Button type="submit" size="sm">
                      Confirmar entrega
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
        <Button asChild variant="outline">
          <Link href="/servicos/ferramentas" onClick={fechar}>
            Ver ferramentas
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
