"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { AppRole } from "@/lib/permissions";
import { cn } from "@/utils/cn";

type AppSidebarProps = {
  profile: {
    nome?: string | null;
    role: AppRole;
    id?: string | null;
  } | null;
  permissions?: Record<string, boolean>;
};

const STORAGE_KEY = "una-flow:sidebar-expanded";

export function AppSidebar({ profile, permissions = {} }: AppSidebarProps) {
  const [expanded, setExpanded] = useState(false);

  // Lembra a preferência entre recarregamentos (a troca via clique persiste
  // sozinha entre navegações pelo Link, já que o layout não desmonta — isto
  // aqui cobre só o caso de dar F5 ou abrir em outra aba).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setExpanded(true);
    }
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      data-no-print
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex",
        expanded ? "w-72" : "w-16",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={expanded ? "Recolher menu" : "Fixar menu aberto"}
        title={expanded ? "Recolher menu" : "Fixar menu aberto"}
        className="absolute -right-3 top-6 z-50 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
      >
        {expanded ? (
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-3.5" aria-hidden="true" />
        )}
      </button>

      <SidebarNav
        profile={profile}
        permissions={permissions}
        collapsible={!expanded}
      />
      <div
        className={cn(
          "flex border-t border-border py-4",
          expanded
            ? "items-center justify-between gap-3 px-4"
            : "flex-col items-center gap-3 px-2",
        )}
      >
        <UserMenu profile={profile} compact={!expanded} />
        <ThemeToggle />
      </div>
    </aside>
  );
}
