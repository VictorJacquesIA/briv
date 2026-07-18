import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { registrarDecisaoPublica } from "@/features/compras/actions/purchase-actions";
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
            <form action={registrarDecisaoPublica} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <input
                type="hidden"
                name="solicitacao_id"
                value={solicitacao.id}
              />
              <input
                type="hidden"
                name="cliente_id"
                value={solicitacao.cliente_id}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="gestor_nome"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  placeholder="Nome do gestor"
                  required
                />
                <input
                  name="gestor_email"
                  type="email"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  placeholder="E-mail do gestor"
                />
              </div>
              <select
                name="fornecedor_id"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Fornecedor escolhido</option>
                {(solicitacao.cotacoes ?? []).map((cotacao: any) => (
                  <option
                    key={cotacao.fornecedor_id}
                    value={cotacao.fornecedor_id}
                  >
                    {cotacao.fornecedor?.nome_fantasia ??
                      cotacao.fornecedor?.razao_social}
                  </option>
                ))}
              </select>
              <textarea
                name="comentario"
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Comentario"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <ConfirmSubmitButton
                  type="submit"
                  name="decisao"
                  value="autorizar"
                  message="Confirmar autorizacao desta compra?"
                >
                  Autorizar fornecedor
                </ConfirmSubmitButton>
                <ConfirmSubmitButton
                  type="submit"
                  name="decisao"
                  value="recusar"
                  variant="destructive"
                  message="Confirmar recusa desta solicitacao?"
                >
                  Recusar solicitacao
                </ConfirmSubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
