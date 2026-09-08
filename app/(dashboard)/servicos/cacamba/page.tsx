import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MobileCard,
  MobileCardActions,
  MobileCardEmpty,
  MobileCardList,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
import {
  confirmarDevolucaoCacamba,
  confirmarEntregaCacamba,
  confirmarTrocaCacamba,
  solicitarDevolucaoCacamba,
  solicitarTrocaCacamba,
} from "@/features/servicos-obra/actions";
import { CacambaForm } from "@/features/servicos-obra/components/cacamba-form";
import { CacambaFornecedorForm } from "@/features/servicos-obra/components/cacamba-fornecedor-form";
import { CacambaOrcamentoForm } from "@/features/servicos-obra/components/cacamba-orcamento-form";
import {
  getLinkedObrasForUser,
  hasPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { listObras } from "@/services/obras-service";
import { listCacambas } from "@/services/servicos-obra-service";
import { getCurrentProfile } from "@/services/profiles-service";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  solicitada: "Solicitada",
  ativa: "Ativa",
  encerrada: "Encerrada",
};

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

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

  const supabase = await createClient();
  const [
    todasCacambas,
    obrasData,
    linkedObraIds,
    { data: orcamentoItens },
    { data: fornecedores },
  ] = await Promise.all([
    listCacambas(),
    listObras(),
    isGestor
      ? getLinkedObrasForUser(currentProfile.id)
      : Promise.resolve<string[]>([]),
    supabase
      .from("obra_orcamento_itens")
      .select("id,obra_id,descricao")
      .eq("tipo", "insumos")
      .order("descricao"),
    supabase
      .from("fornecedores")
      .select("id,razao_social,nome_fantasia,whatsapp,telefone")
      .eq("ativo", true)
      .order("nome_fantasia"),
  ]);

  const orcamentoItensByObra: Record<
    string,
    Array<{ id: string; descricao: string }>
  > = {};
  for (const item of orcamentoItens ?? []) {
    (orcamentoItensByObra[item.obra_id] ??= []).push({
      id: item.id,
      descricao: item.descricao,
    });
  }

  // Mesma condição usada pra contar o card "Caçambas pendentes" no dashboard
  // (mensagem ainda não enviada, aguardando entrega, ou troca/devolução
  // aguardando confirmação) — não é um único status, então não dá pra
  // filtrar direto via listCacambas({status}).
  const cacambas = filtroPendente
    ? todasCacambas.filter(
        (c: any) =>
          c.status === "pendente" ||
          c.status === "solicitada" ||
          c.acao_pendente,
      )
    : todasCacambas;

  const obrasParaCriar = isGestor
    ? obrasData.filter((obra: any) => linkedObraIds.includes(obra.id))
    : obrasData;

  function podeGerenciar(obraId: string) {
    return !isGestor || linkedObraIds.includes(obraId);
  }

  // Mensagem de solicitação enquanto ainda não foi avisado o fornecedor
  // (status "pendente"); de troca enquanto há um pedido de troca pendente.
  // Devolução não tem mensagem própria (não foi pedida) e caçamba
  // "solicitada"/ativa/encerrada sem pendência não precisa de nenhuma.
  function tipoMensagemCacamba(cacamba: any): "solicitacao" | "troca" | null {
    if (cacamba.status === "pendente") {
      return "solicitacao";
    }
    if (cacamba.acao_pendente === "troca") {
      return "troca";
    }
    return null;
  }

  function StatusCacamba({ cacamba }: { cacamba: any }) {
    return (
      <>
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
              {ACAO_LABELS[cacamba.acao_pendente] ?? cacamba.acao_pendente}
            </Badge>
          </div>
        ) : null}
      </>
    );
  }

  function AcoesCacamba({
    cacamba,
    podeAgirNestaObra,
  }: {
    cacamba: any;
    podeAgirNestaObra: boolean;
  }) {
    return (
      <>
        {canConfirm ? (
          <div className="mb-2">
            <CacambaFornecedorForm
              cacambaId={cacamba.id}
              fornecedores={fornecedores ?? []}
              fornecedorAtual={cacamba.fornecedor ?? null}
              obraNome={cacamba.obra?.nome ?? ""}
              obraEndereco={cacamba.obra?.endereco ?? null}
              tipoMensagem={tipoMensagemCacamba(cacamba)}
            />
          </div>
        ) : null}

        {cacamba.status === "pendente" && canConfirm ? (
          <p className="text-xs text-muted-foreground">
            Envie a mensagem de WhatsApp pro fornecedor pra liberar a
            confirmação de entrega.
          </p>
        ) : null}

        {cacamba.status === "solicitada" && canConfirm ? (
          <form action={confirmarEntregaCacamba}>
            <input type="hidden" name="cacamba_id" value={cacamba.id} />
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
          <div className="flex flex-wrap items-end gap-2">
            <form
              action={solicitarTrocaCacamba}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="cacamba_id" value={cacamba.id} />
              <input
                type="date"
                name="data_prevista"
                required
                aria-label="Data prevista da troca"
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
              >
                Solicitar troca
              </button>
            </form>
            <form
              action={solicitarDevolucaoCacamba}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="cacamba_id" value={cacamba.id} />
              <input
                type="date"
                name="data_prevista"
                required
                aria-label="Data prevista da devolução"
                className="h-9 rounded-md border bg-background px-2 text-sm"
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
          cacamba.mensagem_enviada_em ? (
            <form action={confirmarTrocaCacamba}>
              <input type="hidden" name="cacamba_id" value={cacamba.id} />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
              >
                Confirmar troca
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              Envie a mensagem de WhatsApp antes de confirmar a troca.
            </p>
          )
        ) : null}

        {cacamba.acao_pendente === "devolucao" && canConfirm ? (
          <form action={confirmarDevolucaoCacamba}>
            <input type="hidden" name="cacamba_id" value={cacamba.id} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
            >
              Confirmar devolução
            </button>
          </form>
        ) : null}

        {canConfirm ? (
          <div className="mt-2">
            <CacambaOrcamentoForm
              cacambaId={cacamba.id}
              orcamentoItemId={cacamba.orcamento_item?.id ?? null}
              valor={cacamba.valor != null ? Number(cacamba.valor) : null}
              orcamentoItens={orcamentoItensByObra[cacamba.obra?.id] ?? []}
            />
          </div>
        ) : null}
      </>
    );
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
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Centro de custo</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Data prevista</th>
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
                        {cacamba.orcamento_item?.descricao ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        {cacamba.valor != null
                          ? Number(cacamba.valor).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {formatarData(cacamba.data_prevista)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusCacamba cacamba={cacamba} />
                      </td>
                      <td className="px-3 py-2">{cacamba.observacao ?? "-"}</td>
                      <td className="px-3 py-2">
                        <AcoesCacamba
                          cacamba={cacamba}
                          podeAgirNestaObra={podeAgirNestaObra}
                        />
                      </td>
                    </tr>
                  );
                })}
                {cacambas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma caçamba solicitada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {cacambas.length === 0 ? (
            <MobileCardEmpty>Nenhuma caçamba solicitada ainda.</MobileCardEmpty>
          ) : (
            <MobileCardList>
              {cacambas.map((cacamba: any) => {
                const podeAgirNestaObra = podeGerenciar(cacamba.obra?.id);

                return (
                  <MobileCard key={cacamba.id}>
                    <MobileCardRow label="Obra">
                      {cacamba.obra?.nome}
                    </MobileCardRow>
                    <MobileCardRow label="Tipo">{cacamba.tipo}</MobileCardRow>
                    <MobileCardRow label="Centro de custo">
                      {cacamba.orcamento_item?.descricao ?? "-"}
                    </MobileCardRow>
                    <MobileCardRow label="Valor">
                      {cacamba.valor != null
                        ? Number(cacamba.valor).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "-"}
                    </MobileCardRow>
                    <MobileCardRow label="Data prevista">
                      {formatarData(cacamba.data_prevista)}
                    </MobileCardRow>
                    <MobileCardRow label="Status">
                      <StatusCacamba cacamba={cacamba} />
                    </MobileCardRow>
                    <MobileCardRow label="Observação">
                      {cacamba.observacao ?? "-"}
                    </MobileCardRow>
                    <MobileCardActions>
                      <AcoesCacamba
                        cacamba={cacamba}
                        podeAgirNestaObra={podeAgirNestaObra}
                      />
                    </MobileCardActions>
                  </MobileCard>
                );
              })}
            </MobileCardList>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
