import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolicitacaoForm } from "@/features/compras/components/solicitacao-form";
import {
  assertPermission,
  getLinkedObrasForUser,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { getPurchaseFormOptions, listUnits } from "@/services/compras-service";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function NovaSolicitacaoPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  try {
    await assertPermission(
      currentProfile.role,
      permissions,
      "solicitacoes.create",
    );
  } catch {
    redirect("/compras");
  }

  const isGestorObra = isGestorRole(currentProfile.role);

  const [options, linkedObraIds, units] = await Promise.all([
    getPurchaseFormOptions(),
    isGestorObra
      ? getLinkedObrasForUser(currentProfile.id)
      : Promise.resolve<string[]>([]),
    listUnits(),
  ]);

  const obras = isGestorObra
    ? options.obras.filter((obra: any) => linkedObraIds.includes(obra.id))
    : options.obras;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nova Solicitação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre obra, responsável, o insumo e anexos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da solicitação</CardTitle>
        </CardHeader>
        <CardContent>
          {isGestorObra && obras.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma obra vinculada ao seu usuário. Contate o administrador.
            </p>
          ) : (
            <SolicitacaoForm
              obras={obras}
              units={units}
              lockResponsavel={isGestorObra}
              responsaveis={options.responsaveis}
              currentUser={{
                id: currentProfile.id,
                nome: currentProfile.nome ?? "",
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
