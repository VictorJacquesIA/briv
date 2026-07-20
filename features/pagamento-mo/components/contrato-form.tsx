"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createColaboradorGestor,
  createContrato,
} from "@/features/pagamento-mo/actions/mo-actions";

export function ContratoForm({
  obras,
  colaboradores,
}: {
  obras: Array<{ id: string; nome: string }>;
  colaboradores: Array<{ id: string; nome: string }>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(createContrato, {});
  const [localColaboradores, setLocalColaboradores] = useState(colaboradores);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState("");
  const [showNovoPrestador, setShowNovoPrestador] = useState(false);
  const [prestadorState, prestadorAction] = useActionState(
    createColaboradorGestor,
    {},
  );

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

  useEffect(() => {
    if (state.id) {
      router.push(`/pagamento-mo/contratos`);
    }
  }, [state.id, router]);

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
            <Label htmlFor="colaborador_id">Prestador de serviço</Label>
            <select
              id="colaborador_id"
              name="colaborador_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              value={selectedColaboradorId}
              onChange={(event) => setSelectedColaboradorId(event.target.value)}
            >
              <option value="">Selecione</option>
              {localColaboradores.map((colaborador) => (
                <option key={colaborador.id} value={colaborador.id}>
                  {colaborador.nome}
                </option>
              ))}
            </select>
            <div className="space-y-2">
              <button
                type="button"
                className="text-sm text-primary underline"
                onClick={() => setShowNovoPrestador((prev) => !prev)}
              >
                {showNovoPrestador ? "Cancelar" : "Cadastrar novo prestador"}
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
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="descricao">Serviço contratado</Label>
            <textarea
              id="descricao"
              name="descricao"
              rows={3}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Descreva o serviço combinado com o prestador"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_total">Valor total do contrato</Label>
            <Input
              id="valor_total"
              name="valor_total"
              inputMode="decimal"
              placeholder="0,00"
              required
            />
          </div>
        </div>
        {state.message ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : null}
        <FormToast message={state.message} />
        <Button type="submit">Cadastrar contrato</Button>
      </form>
    </>
  );
}
