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
  // Cores por grupo pra listagem de Compras (/compras) — vermelho/amarelo/
  // verde, independente da cor granular que o mesmo status bruto tem na
  // tela de detalhe (statusGroupKey prefixa "grupo-" pra nunca colidir).
  "grupo-nova_solicitacao":
    "border-destructive/60 bg-destructive/10 text-destructive",
  "grupo-em_cotacao": "border-warning/60 bg-warning/10 text-warning",
  "grupo-pedido_aprovado":
    "border-emerald-500/60 bg-emerald-500/10 text-emerald-500",
  "grupo-finalizado":
    "border-emerald-500/60 bg-emerald-500/10 text-emerald-500",
  "grupo-cancelada": "border-destructive/60 bg-destructive/10 text-destructive",
  "grupo-rejeitada": "border-destructive/60 bg-destructive/10 text-destructive",
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
