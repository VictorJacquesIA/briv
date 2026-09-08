import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalRealtimeRefresh } from "@/components/realtime/global-realtime-refresh";
import { CacambaLembretePopup } from "@/features/servicos-obra/components/cacamba-lembrete-popup";
import { getCurrentProfile } from "@/services/profiles-service";
import { listCacambasVencidas } from "@/services/servicos-obra-service";
import {
  getLinkedObrasForUser,
  getPermissionsForUser,
  hasPermission,
  isGestorRole,
} from "@/lib/permissions";

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

  // Lembrete de caçamba (mensagem/entrega/troca/devolução vencida) — só
  // busca pra quem pode ver caçambas, e só das obras vinculadas quando é
  // gestor de obra.
  const canViewCacamba = hasPermission(
    profile.role,
    permissions,
    "cacamba.view",
  );
  const canConfirmCacamba = hasPermission(
    profile.role,
    permissions,
    "cacamba.confirm",
  );
  const cacambasVencidas = canViewCacamba
    ? await listCacambasVencidas(
        isGestorRole(profile.role)
          ? { obraIds: await getLinkedObrasForUser(profile.id) }
          : undefined,
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      <GlobalRealtimeRefresh />
      {cacambasVencidas.length > 0 ? (
        <CacambaLembretePopup
          cacambas={cacambasVencidas}
          canConfirm={canConfirmCacamba}
        />
      ) : null}
      <AppSidebar profile={profile} permissions={permissions} />
      <div className="lg:pl-16 print:pl-0">
        <AppHeader profile={profile} permissions={permissions} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
