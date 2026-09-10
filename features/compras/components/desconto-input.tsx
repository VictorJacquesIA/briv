"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function parseNumero(valor: string) {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarNumero(valor: number) {
  return valor === 0 ? "" : valor.toFixed(2).replace(".", ",");
}

// Par de campos "Desconto (%)"/"Desconto (R$)" sincronizados: editar um
// recalcula o outro na hora (usando o subtotal atual) — mesmo padrão de
// ValorUnitarioTotalInput. O nome submetido ao form é só o percentual (o
// servidor aplica esse percentual em cada item); o campo em R$ é só uma
// forma alternativa de digitar o mesmo desconto.
export function DescontoInput({
  subtotal,
  onDescontoChange,
}: {
  subtotal: number;
  onDescontoChange: (percentual: number) => void;
}) {
  const percentualRef = useRef<HTMLInputElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);

  function handlePercentualChange(event: React.ChangeEvent<HTMLInputElement>) {
    const percentual = parseNumero(event.target.value);
    const valor = subtotal * (percentual / 100);
    if (valorRef.current) {
      valorRef.current.value = formatarNumero(valor);
    }
    onDescontoChange(percentual);
  }

  function handleValorChange(event: React.ChangeEvent<HTMLInputElement>) {
    const valor = parseNumero(event.target.value);
    const percentual = subtotal > 0 ? (valor / subtotal) * 100 : 0;
    if (percentualRef.current) {
      percentualRef.current.value = formatarNumero(percentual);
    }
    onDescontoChange(percentual);
  }

  // Se o subtotal mudar depois (item editado após o desconto já
  // preenchido), mantém o percentual digitado como referência e só
  // atualiza o valor em R$ equivalente — não apaga o que já foi digitado.
  useEffect(() => {
    const percentualAtual = percentualRef.current
      ? parseNumero(percentualRef.current.value)
      : 0;
    if (valorRef.current) {
      valorRef.current.value = formatarNumero(
        subtotal * (percentualAtual / 100),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
      <div>
        <Label
          htmlFor="desconto_percentual"
          className="text-xs text-muted-foreground"
        >
          Desconto (%)
        </Label>
        <Input
          id="desconto_percentual"
          name="desconto_percentual"
          inputMode="decimal"
          placeholder="0"
          ref={percentualRef}
          onChange={handlePercentualChange}
        />
      </div>
      <div>
        <Label
          htmlFor="desconto_valor"
          className="text-xs text-muted-foreground"
        >
          Desconto (R$)
        </Label>
        <Input
          id="desconto_valor"
          inputMode="decimal"
          placeholder="0,00"
          ref={valorRef}
          onChange={handleValorChange}
        />
      </div>
    </div>
  );
}
