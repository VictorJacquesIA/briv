import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex h-6 items-center rounded-sm border px-2 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/70 bg-primary/15 text-primary",
        secondary: "border-border bg-secondary text-muted-foreground",
        destructive: "border-destructive/60 bg-destructive/10 text-destructive",
        warning: "border-warning/60 bg-warning/10 text-warning",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
