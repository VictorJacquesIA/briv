import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LancamentoForm } from "@/features/pagamento-mo/components/lancamento-form";
import {
  assertPermission,
  getLinkedObrasForUser,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";
import { listColaboradores } from "@/services/pagamento-mo-service";

export default async function NovoLancamentoMoPage() {
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
    redirect("/pagamento-mo");
  }

  const isGestor = isGestorRole(currentProfile.role);
  const supabase = (await createClient()) as any;

  const [
    { data: obrasData },
    colaboradores,
    { data: orcamentoItens },
    linkedObraIds,
  ] = await Promise.all([
    supabase.from("obras").select("id,nome").eq("ativo", true).order("nome"),
    listColaboradores(),
    supabase
      .from("obra_orcamento_itens")
      .select("id,obra_id,descricao")
      .eq("tipo", "mao_de_obra")
      .order("descricao"),
    isGestor
      ? getLinkedObrasForUser(currentProfile.id)
      : Promise.resolve<string[]>([]),
  ]);

  let obras = obrasData ?? [];

  if (isGestor) {
    obras = obras.filter((obra: any) => linkedObraIds.includes(obra.id));
  }

  const orcamentoItensByObra: Record<
    string,
    Array<{ id: string; descricao: string }>
  > = {};
  for (const item of orcamentoItens ?? []) {
    orcamentoItensByObra[item.obra_id] ??= [];
    orcamentoItensByObra[item.obra_id].push({
      id: item.id,
      descricao: item.descricao,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Novo lançamento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGestor
            ? "Solicitação de mão de obra para uma obra vinculada a você."
            : "Solicitação, vale ou reembolso de mão de obra."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          {obras.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {isGestor
                ? "Nenhuma obra vinculada ao seu usuário."
                : "Nenhuma obra ativa cadastrada."}
            </p>
          ) : (
            <LancamentoForm
              obras={obras}
              colaboradores={colaboradores.filter((c: any) => c.ativo)}
              orcamentoItensByObra={orcamentoItensByObra}
              isGestor={isGestor}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
