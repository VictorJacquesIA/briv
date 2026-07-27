import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFornecedor,
  toggleFornecedorAtivo,
} from "@/features/fornecedores/actions/fornecedores-actions";
import { hasPermission, getPermissionsForUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/services/profiles-service";

export default async function FornecedoresPage() {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile?.id) {
    redirect("/login");
  }

  const permissions = await getPermissionsForUser(currentProfile.id);

  if (!hasPermission(currentProfile.role, permissions, "fornecedores.view")) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(
    currentProfile.role,
    permissions,
    "fornecedores.create",
  );
  const canEdit = hasPermission(
    currentProfile.role,
    permissions,
    "fornecedores.edit",
  );

  const supabase = await createClient();
  const { data: fornecedores } = await supabase
    .from("fornecedores")
    .select(
      "id,razao_social,nome_fantasia,cnpj,contato,telefone,whatsapp,email,ativo",
    )
    .order("razao_social");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro de fornecedores usado no fluxo de cotação de compras.
        </p>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createFornecedor}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão social</Label>
                <Input id="razao_social" name="razao_social" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome fantasia</Label>
                <Input id="nome_fantasia" name="nome_fantasia" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato">Contato</Label>
                <Input
                  id="contato"
                  name="contato"
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="Com DDD" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" name="endereco" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mensagem_template">
                  Modelo de mensagem para cotação (opcional)
                </Label>
                <Input
                  id="mensagem_template"
                  name="mensagem_template"
                  placeholder="Use {fornecedor}, {codigo} e {obra} como variáveis"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Adicionar fornecedor</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadastro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Fornecedor</th>
                  <th className="px-3 py-2 text-left">CNPJ</th>
                  <th className="px-3 py-2 text-left">Contato</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {canEdit ? (
                    <th className="px-3 py-2 text-left">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {(fornecedores ?? []).map((fornecedor) => (
                  <tr key={fornecedor.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {fornecedor.nome_fantasia ?? fornecedor.razao_social}
                      </div>
                      {fornecedor.nome_fantasia ? (
                        <div className="text-xs text-muted-foreground">
                          {fornecedor.razao_social}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{fornecedor.cnpj ?? "-"}</td>
                    <td className="px-3 py-2">
                      <div>{fornecedor.contato ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {fornecedor.whatsapp ?? fornecedor.telefone ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {fornecedor.ativo ? "Ativo" : "Inativo"}
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-2">
                        <form action={toggleFornecedorAtivo}>
                          <input
                            type="hidden"
                            name="id"
                            value={fornecedor.id}
                          />
                          <input
                            type="hidden"
                            name="ativo"
                            value={String(fornecedor.ativo)}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            {fornecedor.ativo ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {(fornecedores ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-20 px-3 text-center text-muted-foreground"
                    >
                      Nenhum fornecedor cadastrado.
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
