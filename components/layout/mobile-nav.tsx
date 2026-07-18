"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/permissions-shared";

type MobileNavProps = {
  profile: {
    nome?: string | null;
    role: AppRole;
    id?: string | null;
  } | null;
  permissions?: Record<string, boolean>;
};

export function MobileNav({ profile, permissions = {} }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 isolate z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 z-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex h-dvh w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex h-16 items-center justify-end border-b border-border px-6">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <SidebarNav
              profile={profile}
              permissions={permissions}
              onNavigate={() => setOpen(false)}
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
              <UserMenu profile={profile} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
