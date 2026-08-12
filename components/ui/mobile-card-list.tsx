import * as React from "react";

import { cn } from "@/utils/cn";

/**
 * Alternativa a uma <table> em telas pequenas: mesma linha vira um card com
 * pares label/valor empilhados, sem precisar de scroll lateral. Usar junto
 * com a tabela existente envolvida em "hidden md:block", e este componente
 * em "md:hidden" (ambos leem os mesmos dados, então nada de lógica duplicada
 * além do JSX).
 */
export function MobileCardList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-3 md:hidden", className)} {...props} />;
}

export function MobileCard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-border bg-card p-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function MobileCardRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function MobileCardActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 border-t border-border pt-2",
        className,
      )}
      {...props}
    />
  );
}

export function MobileCardEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground md:hidden",
        className,
      )}
      {...props}
    />
  );
}
