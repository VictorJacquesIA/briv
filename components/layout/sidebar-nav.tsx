import Link from "next/link";
import {
  Boxes,
  Building2,
  ChevronDown,
  Home,
  Package,
  ShoppingCart,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

import { cn } from "@/utils/cn";
import type { AppRole } from "@/lib/permissions-shared";
import { hasPermission } from "@/lib/permissions-shared";

type NavHref =
  | "/dashboard"
  | "/compras"
  | "/usuarios"
  | "/obras"
  | "/materiais"
  | "/materiais/unidades"
  | "/materiais/importar"
  | "/fornecedores"
  | "/pagamento-mo"
  | "/pagamento-mo/colaboradores"
  | "/pagamento-mo/contratos"
  | "/estoque"
  | "/estoque/requisicoes"
  | "/estoque/relatorio"
  | "/estoque/ferramentas"
  | "/servicos/cacamba"
  | "/servicos/desmobilizacao";

type NavChild = {
  label: string;
  href: NavHref;
  requiredPermission?: string;
};

type NavItem = {
  label: string;
  href?: NavHref;
  icon: typeof Home;
  requiredPermission?: string;
  children?: NavChild[];
};

const navigation: NavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Home,
    requiredPermission: "dashboard.view",
  },
  {
    label: "Compras",
    href: "/compras",
    icon: ShoppingCart,
    requiredPermission: "solicitacoes.view",
  },
  {
    label: "Obras",
    href: "/obras",
    icon: Building2,
    requiredPermission: "obras.view",
  },
  {
    label: "Materiais",
    icon: Package,
    requiredPermission: "materiais.view",
    children: [
      {
        label: "Catálogo",
        href: "/materiais",
        requiredPermission: "materiais.view",
      },
      {
        label: "Unidades",
        href: "/materiais/unidades",
        requiredPermission: "materiais.view",
      },
      {
        label: "Importar",
        href: "/materiais/importar",
        requiredPermission: "materiais.import",
      },
    ],
  },
  {
    label: "Fornecedores",
    href: "/fornecedores",
    icon: Store,
    requiredPermission: "fornecedores.view",
  },
  {
    label: "Pagamentos",
    icon: Wallet,
    requiredPermission: "pagamento_mo.view",
    children: [
      {
        label: "Lançamentos",
        href: "/pagamento-mo",
        requiredPermission: "pagamento_mo.view",
      },
      {
        label: "Colaboradores/Prestadores",
        href: "/pagamento-mo/colaboradores",
        requiredPermission: "pagamento_mo.view",
      },
      {
        label: "Contratos (Prestação de Serviço)",
        href: "/pagamento-mo/contratos",
        requiredPermission: "pagamento_mo.view",
      },
    ],
  },
  {
    label: "Estoque",
    icon: Boxes,
    requiredPermission: "estoque.view",
    children: [
      {
        label: "Itens em depósito",
        href: "/estoque",
        requiredPermission: "estoque.view",
      },
      {
        label: "Requisições",
        href: "/estoque/requisicoes",
        requiredPermission: "estoque.view",
      },
      {
        label: "Relatório",
        href: "/estoque/relatorio",
        requiredPermission: "estoque.view",
      },
      {
        label: "Ferramentas",
        href: "/estoque/ferramentas",
        requiredPermission: "ferramentas.view",
      },
    ],
  },
  {
    label: "Serviços de Obra",
    icon: Truck,
    children: [
      {
        label: "Caçamba de Entulho",
        href: "/servicos/cacamba",
        requiredPermission: "cacamba.view",
      },
      {
        label: "Desmobilização",
        href: "/servicos/desmobilizacao",
        requiredPermission: "desmobilizacao.view",
      },
    ],
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: ShieldCheck,
    requiredPermission: "configuracoes.view",
  },
];

// Estilos do menu mobile (drawer cheio, sem rail) — inalterado do
// comportamento original, sem ícones-com-flyout.
const linkClassName =
  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
const disabledClassName =
  "flex h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground/50";
const childLinkClassName =
  "flex h-9 items-center rounded-md pl-11 pr-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

// Estilos do rail recolhido do desktop — cada item é um quadrado só com
// ícone; o rótulo (ou a lista de filhos) some/aparece num flyout
// posicionado à direita, via `group/item` + hover.
const railIconBoxClassName =
  "flex h-11 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover/item:bg-secondary group-hover/item:text-foreground";
// `left-full` sem margem: a caixa do flyout encosta exatamente na borda
// direita do ícone (gap real = 0). Um `ml-2` aqui pareceria mais bonito mas
// cria uma faixa "morta" entre ícone e flyout — o mouse passa por cima dela
// ao se mover na diagonal, o hover do `group/item` cai por um instante e o
// flyout já fechado some antes do cursor chegar. Zero gap = hover contínuo.
const railFlyoutClassName =
  "invisible absolute left-full top-0 z-50 whitespace-nowrap rounded-lg border border-border bg-card opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:visible group-hover/item:opacity-100";
const railChildLinkClassName =
  "block rounded-md px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary";

type SidebarNavProps = {
  profile: {
    nome?: string | null;
    role: AppRole;
    id?: string | null;
  } | null;
  permissions?: Record<string, boolean>;
  onNavigate?: () => void;
  // Rail recolhido do desktop (AppSidebar): ícones só, com o rótulo (item
  // simples) ou os filhos (item com submenu) aparecendo num flyout flutuante
  // ao passar o mouse. O menu mobile (MobileNav) usa este componente sem
  // essa flag e mantém o comportamento normal, sempre expandido.
  collapsible?: boolean;
};

export function SidebarNav({
  profile,
  permissions = {},
  onNavigate,
  collapsible = false,
}: SidebarNavProps) {
  return (
    <nav className={cn("flex-1 space-y-1 py-5", collapsible ? "px-2" : "px-3")}>
      {navigation.map((item) => {
        const allowed = item.requiredPermission
          ? hasPermission(
              profile?.role,
              permissions,
              item.requiredPermission as any,
            )
          : true;

        if (!allowed) {
          return null;
        }

        const visibleChildren = item.children?.filter((child) =>
          child.requiredPermission
            ? hasPermission(
                profile?.role,
                permissions,
                child.requiredPermission as any,
              )
            : true,
        );

        const isGroup = Boolean(visibleChildren && visibleChildren.length > 0);

        if (collapsible) {
          if (isGroup) {
            return (
              <div key={item.label} className="group/item relative">
                <div className={railIconBoxClassName} title={item.label}>
                  <item.icon className="size-4" aria-hidden="true" />
                </div>
                <div className={cn(railFlyoutClassName, "min-w-52 p-1.5")}>
                  <p className="px-2.5 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <div className="space-y-0.5">
                    {visibleChildren!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href as never}
                        className={railChildLinkClassName}
                        onClick={onNavigate}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          if (item.href) {
            return (
              <div key={item.label} className="group/item relative">
                <Link
                  href={item.href as never}
                  className={cn(
                    railIconBoxClassName,
                    item.href === "/dashboard" &&
                      "border border-primary/30 bg-secondary text-foreground",
                  )}
                  onClick={onNavigate}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                </Link>
                <div
                  className={cn(
                    railFlyoutClassName,
                    "px-3 py-2 text-sm font-medium text-foreground",
                  )}
                >
                  {item.label}
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.label}
              className={cn(
                railIconBoxClassName,
                "cursor-not-allowed opacity-50",
              )}
              title={item.label}
            >
              <item.icon className="size-4" aria-hidden="true" />
            </div>
          );
        }

        if (isGroup) {
          return (
            <details key={item.label} className="group">
              <summary
                className={cn(linkClassName, "cursor-pointer list-none")}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
                <ChevronDown
                  className="ml-auto size-4 shrink-0 text-muted-foreground/70 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="space-y-1 pt-1">
                {visibleChildren!.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href as never}
                    className={childLinkClassName}
                    onClick={onNavigate}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </details>
          );
        }

        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href as never}
              className={cn(
                linkClassName,
                item.href === "/dashboard" &&
                  "border border-primary/30 bg-secondary text-foreground",
              )}
              onClick={onNavigate}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        }

        return (
          <span key={item.label} className={disabledClassName}>
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}
