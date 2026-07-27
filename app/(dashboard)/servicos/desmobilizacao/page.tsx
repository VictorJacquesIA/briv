import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmarDesmobilizacao } from "@/features/servicos-obra/actions";
import { DesmobilizacaoForm } from "@/features/servicos-obra/components/desmobilizacao-form";
import {
  getLinkedObrasForUser,
  hasPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { listObras } from "@/services/obras-service";
import { listDesmobilizacoes } from "@/services/servicos-obra-service";
import { getCurrentProfile } from "@/services/profiles-service";

const STATUS_FILTRO_LABELS: Record<string, string> = {
  pendente: "Pendentes",
  concluida: "Concluídas",
};

export default async function DesmobilizacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "desmobilizacao.view")) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(
    currentProfile.role,
    permissions,
    "desmobilizacao.create",
  );
  const canConfirm = hasPermission(
    currentProfile.role,
    permissions,
    "desmobilizacao.confirm",
  );
  const isGestor = isGestorRole(currentProfile.role);

  const params = await searchParams;
  const status =
    params.status === "pendente" || params.status === "concluida"
      ? params.status
      : undefined;

  const [desmobilizacoes, obrasData, linkedObraIds] = await Promise.all([
    listDesmobilizacoes({ status }),
    listObras(),
    isGestor
      ? getLinkedObrasForUser(currentProfile.id)
      : Promise.resolve<string[]>([]),
  ]);

  const obrasParaCriar = isGestor
    ? obrasData.filter((obra: any) => linkedObraIds.includes(obra.id))
    : obrasData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Desmobilização
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitação de desmobilização da obra para uma data.
          </p>
          {status ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Filtrando por: {STATUS_FILTRO_LABELS[status]} ·{" "}
              <Link href="/servicos/desmobilizacao" className="underline">
                Ver todos
              </Link>
            </p>
          ) : null}
        </div>
        {canCreate && obrasParaCriar.length > 0 ? (
          <DesmobilizacaoForm obras={obrasParaCriar} />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Data desejada</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {canConfirm ? (
                    <th className="px-3 py-2 text-left">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {desmobilizacoes.map((solicitacao: any) => (
                  <tr key={solicitacao.id} className="border-t">
                    <td className="px-3 py-2">{solicitacao.obra?.nome}</td>
                    <td className="px-3 py-2">
                      {new Date(
                        `${solicitacao.data_desmobilizacao}T00:00:00`,
                      ).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {solicitacao.observacao ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          solicitacao.status === "concluida"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {solicitacao.status === "concluida"
                          ? "Concluída"
                          : "Pendente"}
                      </Badge>
                    </td>
                    {canConfirm ? (
                      <td className="px-3 py-2">
                        {solicitacao.status === "pendente" ? (
                          <form action={confirmarDesmobilizacao}>
                            <input
                              type="hidden"
                              name="id"
                              value={solicitacao.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                            >
                              Concluir
                            </button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
                {desmobilizacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canConfirm ? 5 : 4}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma desmobilização solicitada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
