"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/utils/cn";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // pointer-events-auto: o Radix Dialog põe pointer-events:none no
        // <body> inteiro pra travar interação fora do modal, e reativa
        // pointer-events:auto só no próprio DialogContent. O Popover é
        // portalizado direto pro <body> (irmão do Dialog, não filho) — sem
        // esse reset explícito, ele herda o "none" do body: renderiza por
        // cima visualmente, mas nenhum clique registra nele (era exatamente
        // o bug do combobox de insumo dentro dos dialogs de entrada/saída de
        // estoque e solicitação do gestor). z-[60] fica acima do Dialog
        // (z-50) por garantia, mas o pointer-events é a correção real.
        "pointer-events-auto z-[60] w-auto rounded-md border border-border bg-card p-4 text-card-foreground shadow-md outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
