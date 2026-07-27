import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GestorSolicitacaoForm } from "@/features/compras/components/gestor-solicitacao-form";
import { SolicitacaoForm } from "@/features/compras/components/solicitacao-form";
import {
  assertPermission,
  getLinkedObrasForUser,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  // orcamentoItensByObra só é consumido pelo SolicitacaoForm (não-gestor);
  // pular a query pro gestor evita um round-trip descartado. As 4 buscas
  // abaixo são independentes entre si, então rodam em paralelo.
  const [options, orcamentoItensResult, linkedObraIds, units] =
    await Promise.all([
      getPurchaseFormOptions(),
      isGestorObra
        ? Promise.resolve({
            data: [] as Array<{
              id: string;
              obra_id: string;
              descricao: string;
            }>,
          })
        : supabase
            .from("obra_orcamento_itens")
            .select("id,obra_id,descricao")
            .eq("tipo", "insumos")
            .order("descricao"),
      isGestorObra
        ? getLinkedObrasForUser(currentProfile.id)
        : Promise.resolve<string[]>([]),
      isGestorObra ? listUnits() : Promise.resolve([]),
    ]);

  let formOptions = options;

  if (isGestorObra) {
    formOptions = {
      ...options,
      obras: options.obras.filter((obra: any) =>
        linkedObraIds.includes(obra.id),
      ),
    };
  }

  const orcamentoItensByObra: Record<
    string,
    Array<{ id: string; descricao: string }>
  > = {};
  for (const item of orcamentoItensResult.data ?? []) {
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
          Nova Solicitação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre obra, responsável, materiais, quantidades e anexos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da solicitação</CardTitle>
        </CardHeader>
        <CardContent>
          {isGestorObra && formOptions.obras.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma obra vinculada ao seu usuário. Contate o administrador.
            </p>
          ) : isGestorObra ? (
            <GestorSolicitacaoForm
              obras={formOptions.obras}
              units={units}
              currentUser={{
                id: currentProfile.id,
                nome: currentProfile.nome ?? "",
              }}
            />
          ) : (
            <SolicitacaoForm
              options={formOptions}
              lockResponsavel={false}
              currentUser={{
                id: currentProfile.id,
                nome: currentProfile.nome ?? "",
              }}
              orcamentoItensByObra={orcamentoItensByObra}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
