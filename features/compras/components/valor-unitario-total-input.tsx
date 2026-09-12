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

// Par de campos "Unitário"/"Total" sincronizados: editar um recalcula o
// outro na hora (usando a quantidade do item), sem precisar controlar os
// inputs via state do React — só espelha o valor calculado no outro input
// via ref. O nome submetido ao form continua sendo só o do unitário
// (o servidor já calcula o total a partir dele); o campo "Total" é só uma
// forma alternativa de digitar o mesmo valor.
export function ValorUnitarioTotalInput({
  id,
  name,
  quantidade,
  defaultValorUnitario,
  disabled,
  onTotalChange,
}: {
  id: string;
  name: string;
  quantidade: number;
  defaultValorUnitario?: number | null;
  disabled?: boolean;
  onTotalChange: (total: number) => void;
}) {
  const unitarioRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLInputElement>(null);

  function handleUnitarioChange(event: React.ChangeEvent<HTMLInputElement>) {
    const unitario = parseNumero(event.target.value);
    const total = unitario * quantidade;
    if (totalRef.current) {
      totalRef.current.value = formatarNumero(total);
    }
    onTotalChange(total);
  }

  function handleTotalChange(event: React.ChangeEvent<HTMLInputElement>) {
    const total = parseNumero(event.target.value);
    const unitario = quantidade > 0 ? total / quantidade : 0;
    if (unitarioRef.current) {
      unitarioRef.current.value = formatarNumero(unitario);
    }
    onTotalChange(total);
  }

  useEffect(() => {
    if (disabled) {
      onTotalChange(0);
      return;
    }
    const unitarioAtual = unitarioRef.current
      ? parseNumero(unitarioRef.current.value)
      : (defaultValorUnitario ?? 0);
    onTotalChange(unitarioAtual * quantidade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, quantidade]);

  const defaultUnitarioStr =
    defaultValorUnitario != null ? formatarNumero(defaultValorUnitario) : "";
  const defaultTotalStr =
    defaultValorUnitario != null
      ? formatarNumero(defaultValorUnitario * quantidade)
      : "";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div>
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          Unitário
        </Label>
        <Input
          id={id}
          name={name}
          inputMode="decimal"
          placeholder="0,00"
          disabled={disabled}
          defaultValue={defaultUnitarioStr}
          ref={unitarioRef}
          onChange={handleUnitarioChange}
        />
      </div>
      <div>
        <Label
          htmlFor={`${id}_total`}
          className="text-xs text-muted-foreground"
        >
          Total
        </Label>
        <Input
          id={`${id}_total`}
          inputMode="decimal"
          placeholder="0,00"
          disabled={disabled}
          defaultValue={defaultTotalStr}
          ref={totalRef}
          onChange={handleTotalChange}
        />
      </div>
    </div>
  );
}
