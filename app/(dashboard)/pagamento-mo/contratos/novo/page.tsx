import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContratoForm } from "@/features/pagamento-mo/components/contrato-form";
import {
  assertPermission,
  getLinkedObrasForUser,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";
import { listColaboradores } from "@/services/pagamento-mo-service";

export default async function NovoContratoMoPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  try {
    await assertPermission(
      currentProfile.role,
      permissions,
      "pagamento_mo.create",
    );
  } catch {
    redirect("/pagamento-mo/contratos");
  }

  const isGestor = isGestorRole(currentProfile.role);
  const supabase = await createClient();

  const [{ data: obrasData }, colaboradores, linkedObraIds] = await Promise.all(
    [
      supabase.from("obras").select("id,nome").eq("ativo", true).order("nome"),
      listColaboradores(),
      isGestor
        ? getLinkedObrasForUser(currentProfile.id)
        : Promise.resolve<string[]>([]),
    ],
  );

  let obras = obrasData ?? [];

  if (isGestor) {
    obras = obras.filter((obra: any) => linkedObraIds.includes(obra.id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo contrato</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Valor fechado com um prestador de serviço para uma obra.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent>
          {obras.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {isGestor
                ? "Nenhuma obra vinculada ao seu usuário."
                : "Nenhuma obra ativa cadastrada."}
            </p>
          ) : (
            <ContratoForm
              obras={obras}
              colaboradores={colaboradores.filter((c: any) => c.ativo)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
