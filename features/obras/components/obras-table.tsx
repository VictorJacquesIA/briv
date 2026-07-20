"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { FASE_LABELS } from "@/lib/obras-constants";

type ObraRow = {
  id: string;
  nome: string;
  codigo: string | null;
  fase: string;
  ativo: boolean;
  cliente?: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
  } | null;
};

const columns: ColumnDef<ObraRow>[] = [
  {
    accessorKey: "nome",
    header: "Obra",
    cell: ({ row }) => (
      <Link
        href={`/obras/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.nome}
      </Link>
    ),
  },
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => row.original.codigo ?? "-",
  },
  {
    accessorKey: "fase",
    header: "Fase",
    cell: ({ row }) => FASE_LABELS[row.original.fase] ?? row.original.fase,
  },
  {
    accessorKey: "ativo",
    header: "Status",
    cell: ({ row }) => (row.original.ativo ? "Ativa" : "Inativa"),
  },
];

export function ObrasTable({ data }: { data: ObraRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="Nenhuma obra cadastrada."
    />
  );
}
