"use client";

import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import {
  escolherFornecedorCacamba,
  marcarMensagemCacambaEnviada,
} from "@/features/servicos-obra/actions";
import { cacambaMessage, waLink } from "@/services/whatsapp-service";

type Fornecedor = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  whatsapp: string | null;
  telefone: string | null;
};

export function CacambaFornecedorForm({
  cacambaId,
  fornecedores,
  fornecedorAtual,
  obraNome,
  obraEndereco,
  tipoMensagem,
}: {
  cacambaId: string;
  fornecedores: Fornecedor[];
  fornecedorAtual: Fornecedor | null;
  obraNome: string;
  obraEndereco: string | null;
  tipoMensagem: "solicitacao" | "troca" | null;
}) {
  const [state, action] = useActionState(escolherFornecedorCacamba, {});
  const [isPending, startTransition] = useTransition();
  const telefone = fornecedorAtual?.whatsapp ?? fornecedorAtual?.telefone;

  // Abre o WhatsApp com a mensagem pronta e, no mesmo clique, marca que a
  // mensagem foi enviada — é isso que libera "Confirmar entrega"/"Confirmar
  // troca" no servidor (inserirEventoCacamba exige mensagem_enviada_em).
  function handleEnviar() {
    window.open(
      waLink(
        telefone,
        cacambaMessage({
          tipo: tipoMensagem!,
          obra: obraNome,
          endereco: obraEndereco,
        }),
      ),
      "_blank",
      "noopener,noreferrer",
    );
    startTransition(() => {
      marcarMensagemCacambaEnviada(cacambaId);
    });
  }

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-col gap-2 sm:max-w-xs">
        <input type="hidden" name="cacamba_id" value={cacambaId} />
        <select
          name="fornecedor_id"
          defaultValue={fornecedorAtual?.id ?? ""}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Sem fornecedor</option>
          {fornecedores.map((fornecedor) => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome_fantasia ?? fornecedor.razao_social}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" className="w-full">
          Salvar fornecedor
        </Button>
      </form>
      <FormToast message={state.message} />
      {tipoMensagem && telefone ? (
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={isPending}
          onClick={handleEnviar}
        >
          Enviar WhatsApp ({tipoMensagem === "troca" ? "troca" : "solicitação"})
        </Button>
      ) : null}
    </div>
  );
}
