import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registrarDecisaoPublica } from "@/features/compras/actions/purchase-actions";
import { AprovacaoDecisao } from "@/features/compras/components/aprovacao-decisao";
import { Comparativo } from "@/features/compras/components/comparativo";
import { getPublicApprovalByToken } from "@/services/compras-service";

export default async function PublicApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const solicitacao = await getPublicApprovalByToken(token);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo />
          <div className="sm:text-right">
            <h1 className="text-2xl font-semibold tracking-tight">
              Aprovacao de compra
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Solicitacao {solicitacao.codigo ?? solicitacao.id.slice(0, 8)} -{" "}
              {solicitacao.obra?.nome}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparativo</CardTitle>
          </CardHeader>
          <CardContent>
            <Comparativo solicitacao={solicitacao} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisao do gestor</CardTitle>
          </CardHeader>
          <CardContent>
            <AprovacaoDecisao
              token={token}
              solicitacaoId={solicitacao.id}
              itens={solicitacao.itens ?? []}
              cotacoes={solicitacao.cotacoes ?? []}
              action={registrarDecisaoPublica}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
