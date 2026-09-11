"use client";

import { Button } from "@/components/ui/button";

// Mesma lógica de cache-busting do GerarRelatorioButton (obras): gera o
// timestamp no clique, não no render, pra nunca servir um PDF antigo do
// cache do navegador/PWA.
export function GerarRelatorioLocadasButton({
  fornecedorId,
}: {
  fornecedorId: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        window.open(
          `/api/ferramentas/locadas/relatorio?fornecedor_id=${fornecedorId}&t=${Date.now()}`,
          "_blank",
        );
      }}
    >
      Gerar PDF
    </Button>
  );
}
