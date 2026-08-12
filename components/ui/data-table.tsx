"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import {
  MobileCard,
  MobileCardEmpty,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado.",
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-11 px-4 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-border/80">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 px-4 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <MobileCardEmpty>{emptyMessage}</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {rows.map((row) => (
            <MobileCard key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header;
                const label =
                  typeof header === "string" ? header : cell.column.id;
                return (
                  <MobileCardRow key={cell.id} label={label}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </MobileCardRow>
                );
              })}
            </MobileCard>
          ))}
        </MobileCardList>
      )}
    </>
  );
}
