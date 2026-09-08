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
  confirmarDevolucaoCacamba,
  confirmarEntregaCacamba,
  confirmarTrocaCacamba,
} from "@/features/servicos-obra/actions";

type CacambaVencida = {
  id: string;
  status: string;
  acao_pendente: string | null;
  data_prevista: string | null;
  obra: { nome: string | null } | null;
};

const ACAO_LABEL: Record<string, string> = {
  mensagem: "envio da mensagem",
  entrega: "entrega",
  troca: "troca",
  devolucao: "devolução",
};

function acaoDaCacamba(cacamba: CacambaVencida) {
  if (cacamba.status === "pendente") {
    return "mensagem";
  }
  if (cacamba.acao_pendente === "troca") {
    return "troca";
  }
  if (cacamba.acao_pendente === "devolucao") {
    return "devolucao";
  }
  return "entrega";
}

function acaoConfirmar(acao: string) {
  if (acao === "troca") {
    return confirmarTrocaCacamba;
  }
  if (acao === "devolucao") {
    return confirmarDevolucaoCacamba;
  }
  return confirmarEntregaCacamba;
}

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

const CHAVE_DISPENSADO = "cacamba-lembrete-dispensado";

// Aparece uma vez por sessão (login) quando há caçamba com data prevista
// vencida — gestor vê o aviso, compras (canConfirm) também pode resolver
// direto por aqui, sem precisar ir até a tela de Caçambas.
export function CacambaLembretePopup({
  cacambas,
  canConfirm,
}: {
  cacambas: CacambaVencida[];
  canConfirm: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cacambas.length === 0) {
      return;
    }
    try {
      if (sessionStorage.getItem(CHAVE_DISPENSADO)) {
        return;
      }
    } catch {
      // Sem acesso ao sessionStorage (aba privada etc.) — mostra mesmo
      // assim, só não vai lembrar que já foi dispensado nessa sessão.
    }
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacambas.length]);

  function fechar() {
    setOpen(false);
    try {
      sessionStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      // Ignorado — só evita reaparecer nessa mesma sessão.
    }
  }

  if (cacambas.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => (value ? setOpen(true) : fechar())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Caçambas com ação pendente</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {cacambas.map((cacamba) => {
            const acao = acaoDaCacamba(cacamba);

            return (
              <div
                key={cacamba.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium">{cacamba.obra?.nome ?? "Obra"}</p>
                <p className="text-muted-foreground">
                  {ACAO_LABEL[acao]} prevista para{" "}
                  {formatarData(cacamba.data_prevista)}
                </p>
                {acao === "mensagem" ? (
                  <p className="mt-2 text-xs text-destructive">
                    A mensagem pro fornecedor ainda não foi enviada.
                  </p>
                ) : canConfirm ? (
                  <form action={acaoConfirmar(acao)} className="mt-2">
                    <input type="hidden" name="cacamba_id" value={cacamba.id} />
                    <Button type="submit" size="sm">
                      Confirmar {ACAO_LABEL[acao]}
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
        <Button asChild variant="outline">
          <Link href="/servicos/cacamba" onClick={fechar}>
            Ver caçambas
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
