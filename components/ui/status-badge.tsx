import { cn } from "@/utils/cn";

const statusClasses: Record<string, string> = {
  rascunho: "border-border bg-secondary text-muted-foreground",
  aberta: "border-border bg-secondary text-muted-foreground",
  em_cotacao: "border-primary/70 bg-transparent text-primary",
  aguardando_aprovacao: "border-warning/60 bg-warning/10 text-warning",
  aprovacao: "border-warning/60 bg-warning/10 text-warning",
  autorizada: "border-primary bg-primary text-primary-foreground",
  pdf_gerado: "border-primary/70 bg-primary/15 text-primary",
  pedido_enviado: "border-primary bg-primary text-primary-foreground",
  finalizada: "border-border bg-muted text-foreground",
  cancelada: "border-destructive/60 bg-destructive/10 text-destructive",
  rejeitada: "border-destructive/60 bg-destructive/10 text-destructive",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-sm border px-2.5 text-xs font-semibold",
        statusClasses[status] ?? statusClasses.rascunho,
        className,
      )}
    >
      {label}
    </span>
  );
}
