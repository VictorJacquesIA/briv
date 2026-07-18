// Lógica pura de papéis/permissões, sem nenhuma dependência de servidor
// (next/headers, supabase/server). Importado tanto por código server-side
// quanto por Client Components (ex: sidebar-nav.tsx dentro do menu mobile) —
// importar isso de lib/permissions.ts a partir de um client component quebra
// o build inteiro, porque aquele arquivo também importa next/headers.

export type AppRole = "adm_geral" | "compras" | "gestor_obra" | "almox";

export type PermissionKey =
  | "dashboard.view"
  | "solicitacoes.view"
  | "solicitacoes.create"
  | "solicitacoes.edit"
  | "cotacoes.view"
  | "cotacoes.create"
  | "cotacoes.edit"
  | "whatsapp.send_quote"
  | "whatsapp.send_approval"
  | "pedidos.generate_pdf"
  | "pedidos.send_supplier"
  | "fornecedores.view"
  | "fornecedores.create"
  | "fornecedores.edit"
  | "obras.view"
  | "obras.create"
  | "obras.edit"
  | "clientes.view"
  | "clientes.create"
  | "clientes.edit"
  | "materiais.view"
  | "materiais.create"
  | "materiais.edit"
  | "historico.view"
  | "configuracoes.view"
  | "usuarios.manage"
  | "financeiro.view"
  | "obras.orcamento.view"
  | "obras.orcamento.edit"
  | "materiais.import"
  | "pagamento_mo.view"
  | "pagamento_mo.create"
  | "pagamento_mo.confirm"
  | "cotacoes.validate"
  | "estoque.view"
  | "estoque.entrada.create"
  | "estoque.saida.create"
  | "estoque.requisicao.confirm";

export const ROLE_LABELS: Record<AppRole, string> = {
  adm_geral: "ADM Geral",
  compras: "Compras",
  gestor_obra: "Gestor de Obra",
  almox: "Almoxarife",
};

export const PERMISSION_KEYS: PermissionKey[] = [
  "dashboard.view",
  "solicitacoes.view",
  "solicitacoes.create",
  "solicitacoes.edit",
  "cotacoes.view",
  "cotacoes.create",
  "cotacoes.edit",
  "whatsapp.send_quote",
  "whatsapp.send_approval",
  "pedidos.generate_pdf",
  "pedidos.send_supplier",
  "fornecedores.view",
  "fornecedores.create",
  "fornecedores.edit",
  "obras.view",
  "obras.create",
  "obras.edit",
  "clientes.view",
  "clientes.create",
  "clientes.edit",
  "materiais.view",
  "materiais.create",
  "materiais.edit",
  "historico.view",
  "configuracoes.view",
  "usuarios.manage",
  "financeiro.view",
  "obras.orcamento.view",
  "obras.orcamento.edit",
  "materiais.import",
  "pagamento_mo.view",
  "pagamento_mo.create",
  "pagamento_mo.confirm",
  "cotacoes.validate",
  "estoque.view",
  "estoque.entrada.create",
  "estoque.saida.create",
  "estoque.requisicao.confirm",
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "dashboard.view": "Ver dashboard",
  "solicitacoes.view": "Ver solicitações",
  "solicitacoes.create": "Criar solicitações",
  "solicitacoes.edit": "Editar solicitações",
  "cotacoes.view": "Ver cotações",
  "cotacoes.create": "Registrar cotações",
  "cotacoes.edit": "Editar/enviar cotações para aprovação",
  "whatsapp.send_quote": "Enviar cotação via WhatsApp",
  "whatsapp.send_approval": "Enviar aprovação via WhatsApp",
  "pedidos.generate_pdf": "Gerar PDF do pedido",
  "pedidos.send_supplier": "Enviar pedido ao fornecedor",
  "fornecedores.view": "Ver fornecedores",
  "fornecedores.create": "Criar fornecedores",
  "fornecedores.edit": "Editar fornecedores",
  "obras.view": "Ver obras",
  "obras.create": "Criar obras",
  "obras.edit": "Editar obras",
  "clientes.view": "Ver clientes",
  "clientes.create": "Criar clientes",
  "clientes.edit": "Editar clientes",
  "materiais.view": "Ver materiais",
  "materiais.create": "Criar materiais",
  "materiais.edit": "Editar materiais",
  "historico.view": "Ver histórico auditável",
  "configuracoes.view": "Ver configurações e papéis de usuário",
  "usuarios.manage": "Criar usuários e gerenciar permissões",
  "financeiro.view": "Ver resumo financeiro",
  "obras.orcamento.view": "Ver orçamento da obra",
  "obras.orcamento.edit": "Editar orçamento da obra",
  "materiais.import": "Importar materiais/unidades via CSV",
  "pagamento_mo.view": "Ver pagamentos de mão de obra",
  "pagamento_mo.create": "Lançar mão de obra (solicitação/vale/reembolso)",
  "pagamento_mo.confirm": "Confirmar pagamento de mão de obra",
  "cotacoes.validate": "Validar valores extraídos de cotações",
  "estoque.view": "Ver itens em depósito, movimentações e requisições",
  "estoque.entrada.create": "Registrar entradas manuais de estoque",
  "estoque.saida.create": "Registrar saídas manuais de estoque",
  "estoque.requisicao.confirm": "Confirmar separação e baixa de requisições",
};

export const DEFAULT_COMPRAS_PERMISSIONS: Record<PermissionKey, boolean> = {
  "dashboard.view": true,
  "solicitacoes.view": true,
  "solicitacoes.create": true,
  "solicitacoes.edit": true,
  "cotacoes.view": true,
  "cotacoes.create": true,
  "cotacoes.edit": true,
  "whatsapp.send_quote": true,
  "whatsapp.send_approval": true,
  "pedidos.generate_pdf": true,
  "pedidos.send_supplier": true,
  "fornecedores.view": true,
  "fornecedores.create": true,
  "fornecedores.edit": true,
  "obras.view": true,
  "obras.create": true,
  "obras.edit": true,
  "clientes.view": true,
  "clientes.create": true,
  "clientes.edit": true,
  "materiais.view": true,
  "materiais.create": true,
  "materiais.edit": true,
  "historico.view": true,
  "configuracoes.view": false,
  "usuarios.manage": false,
  "financeiro.view": true,
  "obras.orcamento.view": true,
  "obras.orcamento.edit": true,
  "materiais.import": true,
  "pagamento_mo.view": true,
  "pagamento_mo.create": true,
  "pagamento_mo.confirm": true,
  "cotacoes.validate": true,
  "estoque.view": true,
  "estoque.entrada.create": true,
  "estoque.saida.create": true,
  "estoque.requisicao.confirm": false,
};

export const DEFAULT_GESTOR_PERMISSIONS: Record<PermissionKey, boolean> = {
  "dashboard.view": true,
  "solicitacoes.view": true,
  "solicitacoes.create": true,
  "solicitacoes.edit": true,
  "cotacoes.view": false,
  "cotacoes.create": false,
  "cotacoes.edit": false,
  "whatsapp.send_quote": false,
  "whatsapp.send_approval": false,
  "pedidos.generate_pdf": false,
  "pedidos.send_supplier": false,
  "fornecedores.view": false,
  "fornecedores.create": false,
  "fornecedores.edit": false,
  "obras.view": true,
  "obras.create": false,
  "obras.edit": false,
  "clientes.view": false,
  "clientes.create": false,
  "clientes.edit": false,
  "materiais.view": false,
  "materiais.create": false,
  "materiais.edit": false,
  "historico.view": true,
  "configuracoes.view": false,
  "usuarios.manage": false,
  "financeiro.view": false,
  "obras.orcamento.view": true,
  "obras.orcamento.edit": false,
  "materiais.import": false,
  "pagamento_mo.view": true,
  "pagamento_mo.create": true,
  "pagamento_mo.confirm": false,
  "cotacoes.validate": false,
  "estoque.view": false,
  "estoque.entrada.create": false,
  "estoque.saida.create": false,
  "estoque.requisicao.confirm": false,
};

export const DEFAULT_ALMOX_PERMISSIONS: Record<PermissionKey, boolean> = {
  "dashboard.view": true,
  "solicitacoes.view": false,
  "solicitacoes.create": false,
  "solicitacoes.edit": false,
  "cotacoes.view": false,
  "cotacoes.create": false,
  "cotacoes.edit": false,
  "whatsapp.send_quote": false,
  "whatsapp.send_approval": false,
  "pedidos.generate_pdf": false,
  "pedidos.send_supplier": false,
  "fornecedores.view": false,
  "fornecedores.create": false,
  "fornecedores.edit": false,
  "obras.view": false,
  "obras.create": false,
  "obras.edit": false,
  "clientes.view": false,
  "clientes.create": false,
  "clientes.edit": false,
  "materiais.view": false,
  "materiais.create": false,
  "materiais.edit": false,
  "historico.view": false,
  "configuracoes.view": false,
  "usuarios.manage": false,
  "financeiro.view": false,
  "obras.orcamento.view": false,
  "obras.orcamento.edit": false,
  "materiais.import": false,
  "pagamento_mo.view": false,
  "pagamento_mo.create": false,
  "pagamento_mo.confirm": false,
  "cotacoes.validate": false,
  "estoque.view": true,
  "estoque.entrada.create": true,
  "estoque.saida.create": true,
  "estoque.requisicao.confirm": true,
};

export function defaultPermissionsForRole(
  role: AppRole,
): Record<PermissionKey, boolean> {
  if (role === "compras") {
    return DEFAULT_COMPRAS_PERMISSIONS;
  }

  if (role === "almox") {
    return DEFAULT_ALMOX_PERMISSIONS;
  }

  return DEFAULT_GESTOR_PERMISSIONS;
}

export function normalizeRole(role?: string | null): AppRole {
  const value = role?.toLowerCase();

  if (value === "adm_geral" || value === "administrador") {
    return "adm_geral";
  }

  if (value === "compras" || value === "comprador") {
    return "compras";
  }

  if (value === "almox") {
    return "almox";
  }

  return "gestor_obra";
}

export function isAdminRole(role?: string | null) {
  return normalizeRole(role) === "adm_geral";
}

export function isComprasRole(role?: string | null) {
  return normalizeRole(role) === "compras";
}

export function isGestorRole(role?: string | null) {
  return normalizeRole(role) === "gestor_obra";
}

export function isAlmoxRole(role?: string | null) {
  return normalizeRole(role) === "almox";
}

export function hasPermission(
  role: string | null | undefined,
  permissions: Record<string, boolean> | undefined,
  permission: PermissionKey,
) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "adm_geral") {
    return true;
  }

  if (normalizedRole === "compras") {
    return permissions?.[permission] ?? DEFAULT_COMPRAS_PERMISSIONS[permission];
  }

  if (normalizedRole === "gestor_obra") {
    return permissions?.[permission] ?? DEFAULT_GESTOR_PERMISSIONS[permission];
  }

  if (normalizedRole === "almox") {
    return permissions?.[permission] ?? DEFAULT_ALMOX_PERMISSIONS[permission];
  }

  return false;
}

export function toPermissionMap(
  rows:
    | Array<{ permission_key: string; allowed?: boolean | null }>
    | null
    | undefined,
) {
  return (rows ?? []).reduce<Record<string, boolean>>((acc, row) => {
    acc[row.permission_key] = row.allowed ?? false;
    return acc;
  }, {});
}
