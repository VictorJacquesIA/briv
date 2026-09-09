import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MobileCard,
  MobileCardActions,
  MobileCardRow,
} from "@/components/ui/mobile-card-list";
import { DecidirFerramentaForm } from "@/features/ferramentas/components/decidir-ferramenta-form";
import { EditarLocacaoFerramentaForm } from "@/features/ferramentas/components/editar-locacao-ferramenta-form";
import { FerramentaLocacaoAcoes } from "@/features/ferramentas/components/ferramenta-locacao-acoes";
import { SolicitarFerramentaForm } from "@/features/ferramentas/components/solicitar-ferramenta-form";
import {
  getLinkedObrasForUser,
  hasPermission,
  getPermissionsForUser,
  isGestorRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { listObras } from "@/services/obras-service";
import {
  listFerramentaSolicitacoes,
  listFerramentas,
} from "@/services/ferramentas-service";
import { getCurrentProfile } from "@/services/profiles-service";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  atendida: "Atendida",
  cancelada: "Cancelada",
};

const DECISAO_LABELS: Record<string, string> = {
  deposito: "Depósito",
  locacao: "Locação",
};

const PERIODO_LABELS: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function FerramentasSolicitacoesPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (
    !hasPermission(
      currentProfile.role,
      permissions,
      "ferramentas.solicitacao.view",
    )
  ) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(
    currentProfile.role,
    permissions,
    "ferramentas.solicitacao.create",
  );
  const canDecide = hasPermission(
    currentProfile.role,
    permissions,
    "ferramentas.solicitacao.decide",
  );
  const isGestor = isGestorRole(currentProfile.role);

  const linkedObraIds = isGestor
    ? await getLinkedObrasForUser(currentProfile.id)
    : [];

  const supabase = await createClient();
  const [solicitacoes, obrasData, ferramentasDeposito, { data: fornecedores }] =
    await Promise.all([
      listFerramentaSolicitacoes(
        isGestor ? { obraIds: linkedObraIds } : undefined,
      ),
      listObras(),
      canDecide ? listFerramentas({ status: "deposito" }) : Promise.resolve([]),
      canDecide
        ? supabase
            .from("fornecedores")
            .select("id,razao_social,nome_fantasia,whatsapp,telefone")
            .eq("ativo", true)
            .order("nome_fantasia")
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const obrasParaCriar = isGestor
    ? obrasData.filter((obra: any) => linkedObraIds.includes(obra.id))
    : obrasData;

  function AcoesSolicitacao({ solicitacao }: { solicitacao: any }) {
    if (solicitacao.status === "pendente") {
      if (!canDecide) {
        return (
          <span className="text-xs text-muted-foreground">
            Aguardando o compras decidir
          </span>
        );
      }
      return (
        <DecidirFerramentaForm
          solicitacaoId={solicitacao.id}
          descricao={solicitacao.descricao}
          obraNome={solicitacao.obra?.nome ?? ""}
          obraEndereco={solicitacao.obra?.endereco ?? null}
          periodoUso={solicitacao.periodo_uso}
          dataNecessidade={solicitacao.data_necessidade}
          fornecedorId={solicitacao.fornecedor_id}
          mensagemEnviadaEm={solicitacao.mensagem_enviada_em}
          ferramentasDisponiveis={ferramentasDeposito}
          fornecedores={fornecedores ?? []}
        />
      );
    }

    if (
      solicitacao.status === "atendida" &&
      solicitacao.decisao === "locacao" &&
      solicitacao.ferramenta
    ) {
      if (!solicitacao.ferramenta.ativo && solicitacao.ferramenta.entregue_em) {
        return (
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <span className="text-xs text-muted-foreground">Devolvida</span>
            {canDecide ? (
              <EditarLocacaoFerramentaForm
                ferramentaId={solicitacao.ferramenta.id}
                ferramentaNome={solicitacao.ferramenta.nome}
                obraNome={solicitacao.obra?.nome ?? ""}
                fornecedorAtualId={solicitacao.ferramenta.fornecedor_id}
                valorLocacao={solicitacao.ferramenta.valor_locacao}
                dataPrevistaDevolucao={
                  solicitacao.ferramenta.data_prevista_devolucao
                }
                entregueEm={solicitacao.ferramenta.entregue_em}
                fornecedores={fornecedores ?? []}
              />
            ) : null}
          </div>
        );
      }
      if (!canDecide) {
        return null;
      }
      return (
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <FerramentaLocacaoAcoes
            ferramentaId={solicitacao.ferramenta.id}
            ferramentaNome={solicitacao.ferramenta.nome}
            obraNome={solicitacao.obra?.nome ?? ""}
            obraEndereco={solicitacao.obra?.endereco ?? null}
            fornecedor={solicitacao.ferramenta.fornecedor ?? null}
            mensagemEnviadaEm={solicitacao.ferramenta.mensagem_enviada_em}
            entregueEm={solicitacao.ferramenta.entregue_em}
          />
          <EditarLocacaoFerramentaForm
            ferramentaId={solicitacao.ferramenta.id}
            ferramentaNome={solicitacao.ferramenta.nome}
            obraNome={solicitacao.obra?.nome ?? ""}
            fornecedorAtualId={solicitacao.ferramenta.fornecedor_id}
            valorLocacao={solicitacao.ferramenta.valor_locacao}
            dataPrevistaDevolucao={
              solicitacao.ferramenta.data_prevista_devolucao
            }
            entregueEm={solicitacao.ferramenta.entregue_em}
            fornecedores={fornecedores ?? []}
          />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ferramentas — Solicitações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Peça uma ferramenta pra obra — o compras decide se manda do depósito
            ou loca de um fornecedor.
          </p>
        </div>
        {canCreate && obrasParaCriar.length > 0 ? (
          <SolicitarFerramentaForm obras={obrasParaCriar} />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {/* lg em vez do md padrão do site — essa tela tem muita ação por
              linha (decidir depósito/locação, WhatsApp, confirmações) e
              precisa de mais espaço pra não obrigar scroll lateral. */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card lg:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Entrega</th>
                  <th className="px-3 py-2 text-left">Tempo de uso</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Decisão</th>
                  <th className="px-3 py-2 text-left">Ação</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((solicitacao: any) => (
                  <tr key={solicitacao.id} className="border-t">
                    <td className="px-3 py-2">{solicitacao.obra?.nome}</td>
                    <td className="px-3 py-2">
                      {solicitacao.descricao}
                      {solicitacao.observacao ? (
                        <div className="text-xs text-muted-foreground">
                          {solicitacao.observacao}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {formatarData(solicitacao.data_necessidade)}
                    </td>
                    <td className="px-3 py-2">
                      {solicitacao.periodo_uso
                        ? (PERIODO_LABELS[solicitacao.periodo_uso] ??
                          solicitacao.periodo_uso)
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          solicitacao.status === "atendida"
                            ? "default"
                            : solicitacao.status === "cancelada"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {STATUS_LABELS[solicitacao.status] ??
                          solicitacao.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {solicitacao.decisao
                        ? (DECISAO_LABELS[solicitacao.decisao] ??
                          solicitacao.decisao)
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <AcoesSolicitacao solicitacao={solicitacao} />
                    </td>
                  </tr>
                ))}
                {solicitacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhuma solicitação de ferramenta ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {solicitacoes.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground lg:hidden">
              Nenhuma solicitação de ferramenta ainda.
            </div>
          ) : (
            <div className="space-y-3 lg:hidden">
              {solicitacoes.map((solicitacao: any) => (
                <MobileCard key={solicitacao.id}>
                  <MobileCardRow label="Obra">
                    {solicitacao.obra?.nome}
                  </MobileCardRow>
                  <MobileCardRow label="Descrição">
                    {solicitacao.descricao}
                  </MobileCardRow>
                  <MobileCardRow label="Entrega">
                    {formatarData(solicitacao.data_necessidade)}
                  </MobileCardRow>
                  <MobileCardRow label="Tempo de uso">
                    {solicitacao.periodo_uso
                      ? (PERIODO_LABELS[solicitacao.periodo_uso] ??
                        solicitacao.periodo_uso)
                      : "-"}
                  </MobileCardRow>
                  <MobileCardRow label="Status">
                    <Badge
                      variant={
                        solicitacao.status === "atendida"
                          ? "default"
                          : solicitacao.status === "cancelada"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {STATUS_LABELS[solicitacao.status] ?? solicitacao.status}
                    </Badge>
                  </MobileCardRow>
                  <MobileCardRow label="Decisão">
                    {solicitacao.decisao
                      ? (DECISAO_LABELS[solicitacao.decisao] ??
                        solicitacao.decisao)
                      : "-"}
                  </MobileCardRow>
                  <MobileCardActions>
                    <AcoesSolicitacao solicitacao={solicitacao} />
                  </MobileCardActions>
                </MobileCard>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
