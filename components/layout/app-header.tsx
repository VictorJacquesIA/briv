import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { AppRole } from "@/lib/permissions";

type AppHeaderProps = {
  profile: {
    id?: string | null;
    nome?: string | null;
    role: AppRole;
  } | null;
  permissions?: Record<string, boolean>;
};

export function AppHeader({ profile, permissions }: AppHeaderProps) {
  return (
    <header
      data-no-print
      className="relative sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8"
    >
      <MobileNav profile={profile} permissions={permissions} />
      <Link
        href="/dashboard"
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3"
      >
        <BrandLogo />
      </Link>
    </header>
  );
}
