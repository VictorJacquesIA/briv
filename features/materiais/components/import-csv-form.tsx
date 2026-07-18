"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importItemsCsv,
  importUnidadesCsv,
  type ImportActionState,
} from "@/features/materiais/actions/import-actions";

function ImportForm({
  title,
  description,
  columnsHint,
  action,
}: {
  title: string;
  description: string;
  columnsHint: string;
  action: (
    state: ImportActionState,
    formData: FormData,
  ) => Promise<ImportActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          Colunas esperadas: {columnsHint}
        </p>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`csv-${title}`}>Arquivo CSV</Label>
            <Input
              id={`csv-${title}`}
              name="csv"
              type="file"
              accept=".csv,text/csv"
              required
            />
          </div>
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Importando..." : "Importar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ImportCsvForms() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ImportForm
        title="Importar unidades"
        description="Cria unidades novas; nomes já existentes (case-insensitive) são ignorados."
        columnsHint="nome, codigo (opcional)"
        action={importUnidadesCsv}
      />
      <ImportForm
        title="Importar itens"
        description="Cria itens novos; nomes já existentes (case-insensitive) são ignorados. A coluna unidade é casada por nome com unidades já cadastradas."
        columnsHint="nome, descricao (opcional), unidade (opcional)"
        action={importItemsCsv}
      />
    </div>
  );
}
