import Link from "next/link";
import {
  Boxes,
  Building2,
  Home,
  Package,
  ShoppingCart,
  ShieldCheck,
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
  | "/pagamento-mo"
  | "/pagamento-mo/colaboradores"
  | "/estoque"
  | "/estoque/requisicoes";

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
    ],
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: ShieldCheck,
    requiredPermission: "configuracoes.view",
  },
];

const linkClassName =
  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
const disabledClassName =
  "flex h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground/50";
const childLinkClassName =
  "flex h-9 items-center rounded-md pl-11 pr-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

type SidebarNavProps = {
  profile: {
    nome?: string | null;
    role: AppRole;
    id?: string | null;
  } | null;
  permissions?: Record<string, boolean>;
  onNavigate?: () => void;
};

export function SidebarNav({
  profile,
  permissions = {},
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-5">
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

        if (visibleChildren && visibleChildren.length > 0) {
          return (
            <details key={item.label} className="group" open>
              <summary
                className={cn(linkClassName, "cursor-pointer list-none")}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </summary>
              <div className="space-y-1 pt-1">
                {visibleChildren.map((child) => (
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
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        }

        return (
          <span key={item.label} className={disabledClassName}>
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}
