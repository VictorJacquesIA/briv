"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Toda tabela de negócio que alguma tela do painel lista ou resume. Uma
// mudança em qualquer uma delas — de qualquer módulo (compras, pagamentos,
// caçambas/desmobilização, estoque, ferramentas, obras...) — precisa
// aparecer sozinha na tela, sem o usuário recarregar a página.
const TABELAS = [
  // Compras
  "solicitacoes",
  "solicitacao_itens",
  "solicitacao_anexos",
  "cotacoes",
  "aprovacoes",
  "pedidos",
  // Estoque
  "requisicoes_almox",
  "requisicao_almox_itens",
  "movimentacoes_estoque",
  "estoque_itens",
  // Pagamento de mão de obra
  "lancamentos_mo",
  "contratos_mo",
  "colaboradores",
  // Serviços de obra
  "cacambas",
  "cacamba_eventos",
  "solicitacoes_desmobilizacao",
  // Obras
  "obras",
  "obra_usuarios",
  "obra_orcamento_itens",
  "despesas_manuais",
  // Ferramentas
  "ferramentas",
  "movimentacoes_ferramentas",
  // Cadastros
  "fornecedores",
  "items",
  "unidades",
  "profiles",
  // Auditoria
  "historico",
] as const;

// Montado uma única vez no layout do painel (não em cada página) pra existir
// só um canal Realtime por sessão, cobrindo o sistema inteiro. RLS de cada
// tabela já garante que só chegam eventos do que o usuário logado poderia
// ver via SELECT — este componente não faz nenhum filtro adicional.
export function GlobalRealtimeRefresh() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("global-realtime-refresh");

    // Uma ação do usuário costuma mexer em várias tabelas de uma vez (ex:
    // aprovar uma compra grava aprovacao + solicitacao + pedido + itens) —
    // o debounce junta tudo isso num único refresh.
    const agendarRefresh = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    };

    for (const tabela of TABELAS) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabela },
        agendarRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
