import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro estrutural para a empresa atual e futura evolucao SaaS.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modulo reservado</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          As telas operacionais serao implementadas nos proximos modulos.
        </CardContent>
      </Card>
    </div>
  );
}
