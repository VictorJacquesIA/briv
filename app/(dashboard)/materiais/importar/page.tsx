import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ImportCsvForms } from "@/features/materiais/components/import-csv-form";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function ImportarMateriaisPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "materiais.import")) {
    redirect("/materiais");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Importar materiais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Importação via CSV com upsert (nomes duplicados são ignorados).
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/materiais">Voltar</Link>
        </Button>
      </div>
      <ImportCsvForms />
    </div>
  );
}
