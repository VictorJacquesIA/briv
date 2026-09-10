import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { getCurrentProfile } from "@/services/profiles-service";
import { getColaboradorSaldo } from "@/services/pagamento-mo-service";

export default async function PagosMoPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "pagamento_mo.view")) {
    redirect("/dashboard");
  }

  const saldos = await getColaboradorSaldo();
  const pagos = saldos.filter(
    (saldo: any) => Number(saldo.saldo_confirmado) > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo já confirmado por colaborador/prestador — entre em cada um pra
            ver o histórico completo de pagamentos.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pagamento-mo">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Colaboradores/Prestadores com pagamentos confirmados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum pagamento confirmado ainda.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pagos.map((saldo: any) => (
                <Link
                  key={saldo.colaborador_id}
                  href={`/pagamento-mo/colaboradores/${saldo.colaborador_id}`}
                  className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:bg-secondary/40"
                >
                  <div className="font-medium">{saldo.nome}</div>
                  <div className="text-muted-foreground">
                    Total pago: R${" "}
                    {Number(saldo.saldo_confirmado).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  {Number(saldo.saldo_pendente) !== 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Pendente: R${" "}
                      {Number(saldo.saldo_pendente).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
