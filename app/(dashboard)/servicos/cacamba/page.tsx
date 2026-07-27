import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  confirmarDevolucaoCacamba,
  confirmarEntregaCacamba,
  confirmarTrocaCacamba,
  solicitarDevolucaoCacamba,
  solicitarTrocaCacamba,
} from "@/features/servicos-obra/actions";
import { CacambaForm } from "@/features/servicos-obra/components/cacamba-form";
import {
  getLinkedObrasForUser,
  hasPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { listObras } from "@/services/obras-service";
import { listCacambas } from "@/services/servicos-obra-service";
import { getCurrentProfile } from "@/services/profiles-service";

const STATUS_LABELS: Record<string, string> = {
  solicitada: "Solicitada",
  ativa: "Ativa",
  encerrada: "Encerrada",
};

const ACAO_LABELS: Record<string, string> = {
  troca: "Troca pendente",
  devolucao: "Devolução pendente",
};

export default async function CacambaPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "cacamba.view")) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(
    currentProfile.role,
    permissions,
    "cacamba.create",
  );
  const canConfirm = hasPermission(
    currentProfile.role,
    permissions,
    "cacamba.confirm",
  );
  const isGestor = isGestorRole(currentProfile.role);

  const params = await searchParams;
  const filtroPendente = params.filtro === "pendente";

  const [todasCacambas, obrasData, linkedObraIds] = await Promise.all([
    listCacambas(),
    listObras(),
    isGestor
      ? getLinkedObrasForUser(currentProfile.id)
      : Promise.resolve<string[]>([]),
  ]);

  // Mesma condição usada pra contar o card "Caçambas pendentes" no dashboard
  // (status solicitada aguardando entrega, ou troca/devolução aguardando
  // confirmação) — não é um único status, então não dá pra filtrar direto
  // via listCacambas({status}).
  const cacambas = filtroPendente
    ? todasCacambas.filter(
        (c: any) => c.status === "solicitada" || c.acao_pendente,
      )
    : todasCacambas;

  const obrasParaCriar = isGestor
    ? obrasData.filter((obra: any) => linkedObraIds.includes(obra.id))
    : obrasData;

  function podeGerenciar(obraId: string) {
    return !isGestor || linkedObraIds.includes(obraId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Caçamba de Entulho
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitação, troca e devolução de caçamba nas obras.
          </p>
          {filtroPendente ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Filtrando por: Pendentes ·{" "}
              <Link href="/servicos/cacamba" className="underline">
                Ver todos
              </Link>
            </p>
          ) : null}
        </div>
        {canCreate && obrasParaCriar.length > 0 ? (
          <CacambaForm obras={obrasParaCriar} />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cacambas.map((cacamba: any) => {
                  const podeAgirNestaObra = podeGerenciar(cacamba.obra?.id);

                  return (
                    <tr key={cacamba.id} className="border-t">
                      <td className="px-3 py-2">{cacamba.obra?.nome}</td>
                      <td className="px-3 py-2">{cacamba.tipo}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            cacamba.status === "ativa"
                              ? "default"
                              : cacamba.status === "encerrada"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {STATUS_LABELS[cacamba.status] ?? cacamba.status}
                        </Badge>
                        {cacamba.acao_pendente ? (
                          <div className="mt-1">
                            <Badge variant="warning">
                              {ACAO_LABELS[cacamba.acao_pendente] ??
                                cacamba.acao_pendente}
                            </Badge>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{cacamba.observacao ?? "-"}</td>
                      <td className="px-3 py-2">
                        {cacamba.status === "solicitada" && canConfirm ? (
                          <form action={confirmarEntregaCacamba}>
                            <input
                              type="hidden"
                              name="cacamba_id"
                              value={cacamba.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                            >
                              Confirmar entrega
                            </button>
                          </form>
                        ) : null}

                        {cacamba.status === "ativa" &&
                        !cacamba.acao_pendente &&
                        canCreate &&
                        podeAgirNestaObra ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={solicitarTrocaCacamba}>
                              <input
                                type="hidden"
                                name="cacamba_id"
                                value={cacamba.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                              >
                                Solicitar troca
                              </button>
                            </form>
                            <form action={solicitarDevolucaoCacamba}>
                              <input
                                type="hidden"
                                name="cacamba_id"
                                value={cacamba.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                              >
                                Solicitar devolução
                              </button>
                            </form>
                          </div>
                        ) : null}

                        {cacamba.acao_pendente === "troca" && canConfirm ? (
                          <form action={confirmarTrocaCacamba}>
                            <input
                              type="hidden"
                              name="cacamba_id"
                              value={cacamba.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                            >
                              Confirmar troca
                            </button>
                          </form>
                        ) : null}

                        {cacamba.acao_pendente === "devolucao" && canConfirm ? (
                          <form action={confirmarDevolucaoCacamba}>
                            <input
                              type="hidden"
                              name="cacamba_id"
                              value={cacamba.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
                            >
                              Confirmar devolução
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {cacambas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma caçamba solicitada ainda.
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
