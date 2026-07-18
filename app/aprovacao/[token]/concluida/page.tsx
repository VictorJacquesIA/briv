import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicApprovalDonePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Decisão registrada</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          A ação foi registrada no histórico auditável da solicitação.
        </CardContent>
      </Card>
    </main>
  );
}
