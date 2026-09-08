import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalRealtimeRefresh } from "@/components/realtime/global-realtime-refresh";
import { FerramentaLembretePopup } from "@/features/ferramentas/components/ferramenta-lembrete-popup";
import { CacambaLembretePopup } from "@/features/servicos-obra/components/cacamba-lembrete-popup";
import { listFerramentasLocadasVencidas } from "@/services/ferramentas-service";
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
  const isGestor = isGestorRole(profile.role);
  const linkedObraIds = isGestor
    ? await getLinkedObrasForUser(profile.id)
    : undefined;

  const cacambasVencidas = canViewCacamba
    ? await listCacambasVencidas(
        linkedObraIds ? { obraIds: linkedObraIds } : undefined,
      )
    : [];

  // Mesmo lembrete pra ferramenta locada (mensagem não enviada ou devolução
  // vencida) — usa a permissão de solicitação de ferramenta, não a de
  // gerenciar o catálogo (ferramentas.view), já que o gestor também precisa
  // ver isso.
  const canViewFerramentaSolicitacao = hasPermission(
    profile.role,
    permissions,
    "ferramentas.solicitacao.view",
  );
  const canDecideFerramenta = hasPermission(
    profile.role,
    permissions,
    "ferramentas.solicitacao.decide",
  );
  const ferramentasVencidas = canViewFerramentaSolicitacao
    ? await listFerramentasLocadasVencidas(
        linkedObraIds ? { obraIds: linkedObraIds } : undefined,
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
      {ferramentasVencidas.length > 0 ? (
        <FerramentaLembretePopup
          ferramentas={ferramentasVencidas}
          canConfirm={canDecideFerramenta}
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
