import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { AppRole } from "@/lib/permissions";

type AppSidebarProps = {
  profile: {
    nome?: string | null;
    role: AppRole;
    id?: string | null;
  } | null;
  permissions?: Record<string, boolean>;
};

export function AppSidebar({ profile, permissions = {} }: AppSidebarProps) {
  return (
    <aside
      data-no-print
      className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex"
    >
      <SidebarNav profile={profile} permissions={permissions} />
      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <UserMenu profile={profile} />
        <ThemeToggle />
      </div>
    </aside>
  );
}
