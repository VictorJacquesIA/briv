"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";

type WhatsAppButtonProps = {
  href: string;
  tipo: "cotacao" | "aprovacao" | "pedido";
  destinatario: string;
  entidadeId: string;
  children: React.ReactNode;
};

export function WhatsAppButton({
  href,
  tipo,
  destinatario,
  entidadeId,
  children,
}: WhatsAppButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      onClick={() => {
        void fetch("/api/whatsapp/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            destinatario,
            entidadeId,
            link: href,
          }),
          keepalive: true,
        });
      }}
    >
      <a href={href} target="_blank" rel="noreferrer">
        <Send className="mr-2 size-4" />
        {children}
      </a>
    </Button>
  );
}
