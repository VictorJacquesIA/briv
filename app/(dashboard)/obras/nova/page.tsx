import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObraForm } from "@/features/obras/components/obra-form";
import { assertPermission, getPermissionsForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function NovaObraPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  try {
    await assertPermission(currentProfile.role, permissions, "obras.create");
  } catch {
    redirect("/obras");
  }

  const supabase = (await createClient()) as any;
  const { data: responsaveis } = await supabase
    .from("profiles")
    .select("id,nome")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova obra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre a obra, fase e responsável.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da obra</CardTitle>
        </CardHeader>
        <CardContent>
          <ObraForm responsaveis={responsaveis ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
