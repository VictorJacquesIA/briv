import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentProfile } from "@/services/profiles-service";
import { getPermissionsForUser } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();

  if (!profile?.id) {
    redirect("/login");
  }

  const permissions = profile?.id
    ? await getPermissionsForUser(profile.id as string)
    : {};

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar profile={profile} permissions={permissions} />
      <div className="lg:pl-72 print:pl-0">
        <AppHeader profile={profile} permissions={permissions} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
