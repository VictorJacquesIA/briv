"use client";

import { Button } from "@/components/ui/button";

// Um <a href> fixo (mesma URL sempre) corre o risco de o navegador/PWA
// servir uma resposta em cache de uma geração anterior, mesmo com
// Cache-Control: no-store no servidor — esse header evita cache de
// respostas NOVAS, mas não invalida uma que já ficou salva no aparelho
// antes dessa configuração existir. Gerar o timestamp no clique (não no
// render da página) garante uma URL nova a cada geração, mesmo clicando
// várias vezes sem recarregar a página.
export function GerarRelatorioButton({ obraId }: { obraId: string }) {
  return (
    <Button
      onClick={() => {
        window.open(`/api/obras/${obraId}/relatorio?t=${Date.now()}`, "_blank");
      }}
    >
      Gerar PDF
    </Button>
  );
}
