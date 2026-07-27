# PROJECT_STATUS.md — UNA FLOW (UNA Compras)

> Relatório técnico do estado atual do projeto, gerado a partir de análise completa do
> código-fonte, estrutura de pastas, dependências, migrations e configurações.
> Data da análise: 2026-07-20. Objetivo: servir de contexto completo para continuidade
> de desenvolvimento por outra ferramenta de IA.

---

## 1. Visão geral do projeto

**Nome:** UNA Compras (nome interno do `package.json`: `una-compras`; pasta/marca do
projeto: "UNA FLOW").

**Objetivo/propósito:** Painel interno de gestão para uma construtora (cliente real
atual: "UNA Reforma e Construção") cobrindo o ciclo de compras (solicitação → cotação →
aprovação → pedido → PDF), gestão de obras (orçamento, fases, orçado x realizado),
controle de materiais/estoque/almoxarifado, pagamento de mão de obra (avulsa e por
contrato), controle de ferramentas (empréstimo/devolução) e serviços de obra (caçamba de
entulho, desmobilização).

O sistema foi arquitetado desde o início para evoluir de uma solução single-tenant para
um **SaaS multi-tenant**: quase toda tabela de negócio tem uma coluna `cliente_id` e RLS
que isola dados por tenant, embora hoje exista apenas um tenant real em produção.

**Público-alvo:** Equipe interna de uma construtora — administradores gerais, setor de
compras/administrativo, gestores de obra (acesso restrito às obras vinculadas) e
almoxarifado. Não há hoje nenhuma tela voltada a clientes externos, exceto a página
pública de aprovação de cotação por token (usada por quem aprova a compra, sem precisar
de login).

**Stack tecnológica completa:**

| Camada             | Tecnologia                                                                                                                                              | Versão           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Framework          | Next.js (App Router, `typedRoutes: true`)                                                                                                               | ^15.4.6          |
| Linguagem          | TypeScript (strict mode, target ES2017)                                                                                                                 | ^5.8.3           |
| UI runtime         | React / React DOM                                                                                                                                       | ^19.1.0          |
| Estilo             | TailwindCSS + `tailwindcss-animate`                                                                                                                     | ^3.4.17          |
| Componentes        | shadcn/ui (estilo `new-york`, cor base `zinc`, RSC habilitado) sobre Radix UI (`avatar`, `dialog`, `dropdown-menu`, `label`, `popover`, `slot`, `tabs`) | —                |
| Ícones             | lucide-react                                                                                                                                            | ^0.468.0         |
| Formulários        | react-hook-form + @hookform/resolvers                                                                                                                   | ^7.62.0 / ^5.2.1 |
| Validação          | zod                                                                                                                                                     | ^4.0.17          |
| Tabelas            | @tanstack/react-table                                                                                                                                   | ^8.21.3          |
| Datas              | date-fns, react-day-picker                                                                                                                              | ^4.4.0 / ^10.0.1 |
| Tema               | next-themes (dark/light)                                                                                                                                | ^0.4.6           |
| Banco/Auth/Storage | Supabase (`@supabase/supabase-js`, `@supabase/ssr`)                                                                                                     | ^2.55.0 / ^0.6.1 |
| IA                 | @anthropic-ai/sdk (extração de dados de cotações)                                                                                                       | ^0.110.0         |
| PDF                | pdf-lib                                                                                                                                                 | ^1.17.1          |
| CSV                | papaparse                                                                                                                                               | ^5.5.4           |
| Lint/format        | ESLint (`eslint-config-next`), Prettier + `prettier-plugin-tailwindcss`                                                                                 | ^8.57.1 / ^3.6.2 |
| Git hooks          | Husky + lint-staged                                                                                                                                     | ^9.1.7 / ^15.5.2 |

Não há ORM tradicional — todo acesso ao banco é via SDK do Supabase (`supabase-js`)
usando três "clientes" diferentes conforme o contexto (browser, SSR/cookies, admin com
service role), com tipos gerados/mantidos manualmente em `types/database.ts` (hoje
desatualizado — ver seção 7).

Não existe suíte de testes automatizados configurada (ver seção 7).

---

## 2. Arquitetura

### 2.1 Estrutura de pastas (árvore comentada)

```
.
├── .agents/                  # Cache local de "skills" de agente (supabase, etc.) — tooling, não é código da app
├── .claude/                  # Config do Claude Code (settings, skills espelhadas)
├── .husky/                   # Git hook pre-commit (roda lint-staged)
├── .env.example              # Template das variáveis de ambiente (sem valores)
├── .env.local                # Variáveis reais locais (não versionado — valores não expostos aqui)
├── .eslintrc.json            # ESLint: next/core-web-vitals + next/typescript
├── .mcp.json                 # Config do MCP do Supabase (project_ref iguixokrvatlyajnldqv)
├── .prettierrc               # Prettier: aspas duplas, trailing commas, plugin Tailwind
├── README.md                 # Instruções de setup (em português)
├── docs/
│   └── SISTEMA.md            # Documentação interna do sistema — DESATUALIZADA (datada de 2026-07-09,
│                              #   não cobre estoque/ferramentas/contratos_mo/serviços-obra/papel almox)
├── app/                       # Next.js App Router: rotas, layouts, Route Handlers
│   ├── (auth)/login/          # Tela de login (fora do grupo autenticado)
│   ├── (dashboard)/           # Grupo de rotas autenticadas, com layout de sidebar/header
│   │   ├── clientes/          # STUB — "Módulo reservado", sem CRUD
│   │   ├── compras/           # Fluxo de compras: lista, nova solicitação, detalhe/workflow
│   │   ├── dashboard/         # Home, role-aware (visão geral vs. visão só-estoque do almox)
│   │   ├── estoque/           # Estoque: níveis, entrada/saída, requisições, relatório, ferramentas
│   │   ├── materiais/         # Catálogo de itens/unidades + import CSV
│   │   ├── obras/             # CRUD de obras, orçamento, relatório orçado x realizado
│   │   ├── pagamento-mo/      # Lançamentos de mão de obra, colaboradores, contratos de MO
│   │   ├── servicos/          # Caçamba de entulho e desmobilização
│   │   └── usuarios/          # Gestão de usuários e permissões (só adm_geral)
│   ├── aprovacao/[token]/     # Rota PÚBLICA (sem login) de aprovação de cotação via token
│   └── api/                   # Route Handlers: health, whatsapp/log, obras/[id]/relatorio, estoque/relatorio
├── components/                 # UI compartilhada e não específica de domínio
│   ├── ui/                     # Primitivas shadcn/ui (button, dialog, data-table, etc.)
│   └── layout/                 # Sidebar, header, mobile-nav, theme-toggle, user-menu
├── features/                    # Módulos de domínio (organização feature-based)
│   └── <dominio>/                # auth, compras, dashboard, estoque, ferramentas, materiais,
│       ├── components/           #   obras, pagamento-mo, perfil, servicos-obra, usuarios
│       ├── actions/               # Server Actions ("use server") — mutações
│       ├── schemas/               # Validação Zod (existe só em alguns domínios)
│       └── utils/
├── services/                    # Camada de acesso a dados/regras de negócio server-side
│   ├── ai-extraction-service.ts  # Extração de dados de cotação via Anthropic SDK
│   ├── compras-service.ts, estoque-service.ts, ferramentas-service.ts,
│   ├── historico-service.ts, obras-service.ts, pagamento-mo-service.ts,
│   ├── pdf-service.ts            # Geração de PDFs (pedido de compra, relatórios)
│   ├── profiles-service.ts, request-context.ts, servicos-obra-service.ts, whatsapp-service.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Cliente browser
│   │   ├── server.ts             # Cliente SSR/cookie-based (Server Components/Actions, respeita RLS)
│   │   ├── admin.ts              # Cliente service-role (ignora RLS — uso admin/token público)
│   │   └── middleware.ts         # Refresh de sessão
│   ├── permissions-shared.ts     # Tipos/regras de permissão puros (client-safe)
│   ├── permissions.ts             # Wrapper server-only (usa next/headers) sobre permissions-shared
│   ├── require-actor.ts           # Guard padrão usado nas Server Actions
│   ├── env.ts, constants.ts, obras-constants.ts, date-range.ts, error-message.ts, form-data.ts
├── middleware.ts                 # Middleware Next.js — refresh de sessão + proteção de rotas (parcial, ver seção 7)
├── hooks/                        # use-item-search.ts, use-mounted.ts
├── types/database.ts              # Tipos manuais do banco — DESATUALIZADO (cobre só 3 de 30 tabelas)
├── utils/cn.ts                    # Merge de classes Tailwind
├── public/                        # Assets estáticos (logo)
└── supabase/
    ├── migrations/                 # 32 arquivos SQL (schema, RLS, triggers, views, buckets)
    ├── seed/                       # initial_client.sql, bootstrap-admin.sql.example
    └── scripts/                    # reset-auth-users.mjs, reset-dados-teste.sql (manuais)
```

### 2.2 Padrão de arquitetura

**Monolito em camadas, organizado por domínio (feature-based)** — não é MVC clássico.
Fluxo de comunicação predominante:

```
Component (Server ou Client)
   → Server Action ("use server", em features/<dominio>/actions/*.ts)
      → requireActor(permissão) [lib/require-actor.ts] — checa autenticação + permissão
      → Service (services/*-service.ts) — regra de negócio + query
         → Supabase client (lib/supabase/server.ts, respeitando RLS)
   → revalidatePath / redirect
```

Um punhado de **Route Handlers** (`app/api/*/route.ts`) existe apenas para casos que não
se encaixam bem em Server Actions: geração de PDF para download, health check e um
endpoint de log fire-and-forget de cliques do WhatsApp.

Não há evidência de componentes client-side chamando o Supabase diretamente para
mutações — o fluxo é consistentemente Component → Action → Service → Supabase.

**Defesa em profundidade deliberada:** regras de autorização críticas (ex.: um
`gestor_obra` só pode agir em obras vinculadas a ele via `obra_usuarios`) são
implementadas **duas vezes** — uma vez na Server Action (mensagens de erro amigáveis) e
uma vez em RLS/triggers no Postgres (garantia real). Isso é intencional e documentado nos
comentários das migrations, mas cria risco de dessincronia se um lado for atualizado sem
o outro (já aconteceu — ver bug #2 na seção 7).

**Autenticação/autorização:**

- Supabase Auth (e-mail/senha), sessão via cookies (`@supabase/ssr`), refresh no
  `middleware.ts`.
- 4 papéis fixos: `adm_geral` (acesso total), `compras` (administrativo), `gestor_obra`
  (escopo limitado às obras vinculadas), `almox` (almoxarife, foco em estoque).
- Permissões granulares (40+ `PermissionKey`s) com padrão por papel e overrides por
  usuário em `user_permissions`.
- `requireActor(permissão)` é o guard padrão chamado no início de quase toda Server Action.
- RLS no Postgres espelha as mesmas regras (`same_cliente()`, `is_admin()`,
  `can_access_solicitacao()`, etc.) como camada de garantia independente da aplicação.
- Fluxo público sem login: `/aprovacao/[token]` usa token de 32 bytes com expiração de 14
  dias, servido via cliente admin (service role), já que quem aprova não tem conta.

---

## 3. Funcionalidades implementadas

### 3.1 Por módulo, com status

| Módulo                                        | Rotas principais                                                                      | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compras**                                   | `/compras`, `/compras/nova`, `/compras/[id]`, `/aprovacao/[token]`                    | **Completo** — módulo mais maduro. Fluxo de estados: `aberta → em_cotacao → aguardando_aprovacao → pdf_gerado → pedido_programado → pedido_enviado → finalizada/cancelada/rejeitada`. Inclui: solicitação multi-item com busca type-ahead, decisão estoque-vs-compra por item, cotação por fornecedor (upload + extração via IA), comparativo lado a lado, aprovação pública por token, geração automática de PDF do pedido, botões WhatsApp (`wa.me`) com registro de histórico. |
| **Obras**                                     | `/obras`, `/obras/nova`, `/obras/[id]`                                                | **Completo** para o que existe. Criação, listagem (gestor só vê as suas), edição inline de fase/gestor, itens de orçamento (insumos x mão de obra), relatório orçado x realizado (tela + PDF). Não há tela dedicada de "editar obra" (a action `updateObra` existe mas está documentada como não usada — edição é feita inline).                                                                                                                                                  |
| **Materiais/Unidades**                        | `/materiais`, `/materiais/unidades`, `/materiais/importar`                            | **Completo (básico)**. Criar + ativar/desativar itens e unidades; import em massa via CSV. Sem edição de campos nem exclusão.                                                                                                                                                                                                                                                                                                                                                     |
| **Pagamento de MO (lançamentos)**             | `/pagamento-mo`, `/pagamento-mo/novo`, `/pagamento-mo/colaboradores`                  | **Completo**. Tipos: solicitação/vale/reembolso. Regra de diárias (qtd x valor) mutuamente exclusiva com valor fechado; gestor de obra pode lançar diárias mas não define valor/centro de custo (isso é feito na confirmação por compras/admin); baixa de vale contra pagamento do mesmo colaborador.                                                                                                                                                                             |
| **Contratos de MO**                           | `/pagamento-mo/contratos`, `/pagamento-mo/contratos/novo`                             | **Completo, módulo novo** (adicionado no último commit). Contrato de valor fechado pago em parcelas (lançamentos vinculados). Saldo calculado via view `v_contrato_mo_saldo` com trigger no banco garantindo consistência (lock de linha, não deixa passar do valor total nem lançar em contrato já quitado). Sem UI de edição/cancelamento (por design).                                                                                                                         |
| **Ferramentas**                               | `/estoque/ferramentas`                                                                | **Completo, módulo novo**. Cadastro + empréstimo/devolução com máquina de estados garantida por trigger no banco (não deixa emprestar ferramenta já emprestada, nem devolver a que já está no depósito). **Parcialmente incompleto**: existe função de serviço `listMovimentacoesFerramenta` para histórico de movimentação, mas não há nenhuma tela que a consuma — código órfão. Sem edição/desativação de ferramenta.                                                          |
| **Serviços de obra (Caçamba/Desmobilização)** | `/servicos/cacamba`, `/servicos/desmobilizacao`                                       | **Completo, módulo novo**. Caçamba: ciclo `solicitada → ativa → encerrada`, com troca/devolução como sub-ações pendentes. Desmobilização: `pendente → concluída`. Ambos com trigger de validação de transição de estado no banco.                                                                                                                                                                                                                                                 |
| **Estoque**                                   | `/estoque`, `/estoque/requisicoes`, `/estoque/requisicoes/[id]`, `/estoque/relatorio` | **Completo**. Entrada/saída manual, requisições de almoxarifado com tratamento de falta (shortfall marca divergência na solicitação), relatório em tela + PDF com filtro de período/obra.                                                                                                                                                                                                                                                                                         |
| **Dashboard**                                 | `/dashboard`                                                                          | **Completo**. Conteúdo role-aware: `almox` vê visão só de estoque (itens abaixo do mínimo, requisições pendentes, ferramentas emprestadas); demais papéis veem contadores de compras por status + outras solicitações pendentes + log de atividade paginado com filtro de data.                                                                                                                                                                                                   |
| **Usuários/Permissões**                       | `/usuarios`, `/usuarios/novo`, `/usuarios/[id]`                                       | **Completo**. Criar/editar (nome, e-mail, senha)/excluir usuário, grade de permissões por checkbox, vínculo de gestor a obras. Bloqueia auto-exclusão e exclusão do último `adm_geral`. Restrito a `adm_geral`.                                                                                                                                                                                                                                                                   |
| **Clientes**                                  | `/clientes`                                                                           | **Stub / não implementado** — página é literalmente um card "Módulo reservado", sem query, formulário ou tabela. Reservado para futura administração multi-tenant do SaaS.                                                                                                                                                                                                                                                                                                        |
| **Fornecedores**                              | _(nenhuma rota própria)_                                                              | **Não implementado como tela**. Fornecedores só existem como dropdown dentro do formulário de cotação (`features/compras/components/cotacao-form.tsx`); cadastro hoje é manual via SQL/Supabase Studio. É a lacuna de CRUD mais visível do sistema.                                                                                                                                                                                                                               |
| **Histórico/Auditoria**                       | _(consumido dentro do dashboard e detalhes)_                                          | **Completo**. Tabela `historico` append-only (triggers bloqueiam update/delete), alimentada por praticamente toda ação de mutação.                                                                                                                                                                                                                                                                                                                                                |

### 3.2 Endpoints (Route Handlers)

| Método | Rota                        | Propósito                                                            |
| ------ | --------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/health`               | Healthcheck trivial                                                  |
| POST   | `/api/whatsapp/log`         | Registra clique de link do WhatsApp no histórico (requer auth)       |
| GET    | `/api/obras/[id]/relatorio` | PDF de orçado x realizado da obra (permissão `obras.orcamento.view`) |
| GET    | `/api/estoque/relatorio`    | PDF de relatório de estoque, com filtros (permissão `estoque.view`)  |

### 3.3 Server Actions por domínio

- `features/auth/actions.ts` — `login`, `logout`
- `features/compras/actions/purchase-actions.ts` — `createSolicitacao`, `decidirEstoqueSolicitacao`, `iniciarCotacao`, `salvarCotacao`, `uploadCotacao`, `validarCotacao`, `programarPedido`, `enviarParaAprovacao`, `registrarDecisaoPublica` (usa cliente admin), `avancarFluxo`
- `features/compras/actions/item-actions.ts` — `createUnit`, `createItem`, `searchItemsAction`
- `features/obras/actions/obra-actions.ts` — `createObra`, `updateObra` (não usada), `updateObraFase`, `updateObraGestor`, `createOrcamentoItem`, `deleteOrcamentoItem`
- `features/materiais/actions/materiais-actions.ts` — `createUnidade`, `toggleUnidadeAtivo`, `createItemCatalogo`, `toggleItemAtivo`
- `features/materiais/actions/import-actions.ts` — `importUnidadesCsv`, `importItemsCsv`
- `features/pagamento-mo/actions/mo-actions.ts` — `createLancamento`, `createContrato`, `confirmarLancamento`, `darBaixaVale`, `createColaboradorGestor`, `createColaborador`
- `features/ferramentas/actions.ts` — `createFerramenta`, `registrarSaidaFerramenta`, `registrarEntradaFerramenta`
- `features/servicos-obra/actions.ts` — `createCacamba`, `solicitarTrocaCacamba`, `solicitarDevolucaoCacamba`, `confirmarEntregaCacamba`, `confirmarTrocaCacamba`, `confirmarDevolucaoCacamba`, `createDesmobilizacao`, `confirmarDesmobilizacao`
- `features/estoque/actions.ts` — `registrarEntradaEstoque`, `registrarSaidaEstoque`, `confirmarSeparacao`
- `features/perfil/actions.ts` — edição de perfil (nome/telefone/foto)
- `app/(dashboard)/usuarios/actions.ts` — `updateUserRole`, `createUser`, `updateUserPermissions`, `updateObraVinculos`, `updateUserAccount`, `deleteUser`

Não há marcadores `TODO`/`FIXME`/"não implementado"/"em breve" no código de aplicação —
os únicos gaps reais são os documentados acima (Clientes stub, Fornecedores sem tela,
histórico de ferramentas sem UI).

---

## 4. Banco de dados / Modelos de dados

Banco Postgres via Supabase, sem ORM. Schema definido inteiramente em SQL em
`supabase/migrations/` (32 arquivos, de `202606290001` a `202607180007`). Project ref:
`iguixokrvatlyajnldqv`.

### 4.1 Tabelas (30 no total)

| Tabela                        | Colunas-chave                                                                                                                                     | Relacionamentos (FK)                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `clientes`                    | id, razao_social, nome_fantasia, cnpj, ativo                                                                                                      | raiz do multi-tenant                                                                                          |
| `profiles`                    | id (=auth.users.id), cliente_id, nome, role, telefone, ativo, foto_url                                                                            | id→auth.users; cliente_id→clientes                                                                            |
| `obras`                       | id, cliente_id, nome, codigo, endereco, ativo, fase                                                                                               | cliente_id→clientes                                                                                           |
| `fornecedores`                | id, cliente_id, razao_social, cnpj, email, whatsapp, mensagem_template                                                                            | cliente_id→clientes                                                                                           |
| `materiais` _(depreciada)_    | id, cliente_id, codigo, descricao, unidade                                                                                                        | cliente_id→clientes                                                                                           |
| `solicitacoes`                | id, cliente_id, obra_id, solicitante_id, responsavel_obra_id, status, prioridade, aprovacao_token(+expiry), fornecedor_aprovado_id                | obra_id→obras; solicitante_id/responsavel_obra_id→profiles; fornecedor_aprovado_id→fornecedores               |
| `solicitacao_itens`           | id, solicitacao_id, material_id (legado), item_id (atual), quantidade, quantidade_estoque, orcamento_item_id                                      | solicitacao_id→solicitacoes; item_id→items; orcamento_item_id→obra_orcamento_itens                            |
| `cotacoes`                    | id, cliente_id, solicitacao_id, fornecedor_id, status, frete, prazo_dias, forma_pagamento, total_fornecedor, extracao_ia (jsonb), validado_por/at | solicitacao_id→solicitacoes; fornecedor_id→fornecedores                                                       |
| `cotacao_itens`               | id, cotacao_id, solicitacao_item_id, preco_unitario, valor_total, item_nao_cotado                                                                 | cotacao_id→cotacoes; solicitacao_item_id→solicitacao_itens                                                    |
| `aprovacoes`                  | id, cliente_id, solicitacao_id, aprovador_id, status, gestor_nome/email, fornecedor_escolhido_id                                                  | solicitacao_id→solicitacoes                                                                                   |
| `pedidos`                     | id, cliente_id, solicitacao_id, fornecedor_id, numero, status, valor_total, pdf_path/url, autorizado_por                                          | solicitacao_id→solicitacoes; fornecedor_id→fornecedores                                                       |
| `historico`                   | id, cliente_id, actor_id, entidade, entidade_id, acao, dados (jsonb), status_anterior/novo, ip, user_agent                                        | append-only                                                                                                   |
| `solicitacao_anexos`          | id, cliente_id, solicitacao_id, nome_arquivo, storage_path, content_type, tamanho_bytes                                                           | solicitacao_id→solicitacoes                                                                                   |
| `user_permissions`            | id, user_id, permission_key, allowed                                                                                                              | user_id→profiles; unique(user_id, permission_key)                                                             |
| `obra_usuarios`               | id, obra_id, user_id, papel_na_obra, ativo                                                                                                        | obra_id→obras; user_id→profiles; unique(obra_id, user_id)                                                     |
| `unidades`                    | id, nome (unique case-insensitive), codigo, ativo                                                                                                 | catálogo global (sem cliente_id)                                                                              |
| `items`                       | id, nome (unique case-insensitive), descricao, unidade_id                                                                                         | unidade_id→unidades; catálogo global                                                                          |
| `obra_orcamento_itens`        | id, obra_id, cliente_id, descricao, categoria, valor_orcado, tipo (insumos/mao_de_obra)                                                           | obra_id→obras                                                                                                 |
| `colaboradores`               | id, cliente_id, nome, funcao, telefone, chave_pix, dados_bancarios                                                                                | cliente_id→clientes                                                                                           |
| `lancamentos_mo`              | id, cliente_id, colaborador_id, obra_id, orcamento_item_id, tipo, status, valor, qtd_diarias, valor_diaria, contrato_id, vale_aplicado_em         | colaborador_id→colaboradores; obra_id→obras; contrato_id→contratos_mo; vale_aplicado_em→lancamentos_mo (self) |
| `estoque_itens`               | id, cliente_id, item_id, quantidade_minima                                                                                                        | item_id→items; unique(cliente_id, item_id)                                                                    |
| `movimentacoes_estoque`       | id, cliente_id, estoque_item_id, tipo (entrada/saida), quantidade, obra_id, solicitacao_id, responsavel_id                                        | estoque_item_id→estoque_itens; append-only                                                                    |
| `requisicoes_almox`           | id, cliente_id, solicitacao_id, obra_id, status, criado_por, separado_por/at                                                                      | solicitacao_id→solicitacoes                                                                                   |
| `requisicao_almox_itens`      | id, requisicao_id, solicitacao_item_id, estoque_item_id, quantidade_solicitada/separada                                                           | requisicao_id→requisicoes_almox                                                                               |
| `contratos_mo`                | id, cliente_id, obra_id, colaborador_id, descricao, valor_total, status, criado_por                                                               | obra_id→obras; colaborador_id→colaboradores                                                                   |
| `ferramentas`                 | id, cliente_id, nome, codigo, status (deposito/emprestada), obra_atual_id, ativo                                                                  | obra_atual_id→obras (set null)                                                                                |
| `movimentacoes_ferramentas`   | id, cliente_id, ferramenta_id, tipo (saida/entrada), obra_id, responsavel_id                                                                      | ferramenta_id→ferramentas; append-only                                                                        |
| `cacambas`                    | id, cliente_id, obra_id, tipo, status, acao_pendente                                                                                              | obra_id→obras                                                                                                 |
| `cacamba_eventos`             | id, cliente_id, cacamba_id, tipo, responsavel_id                                                                                                  | cacamba_id→cacambas; append-only                                                                              |
| `solicitacoes_desmobilizacao` | id, cliente_id, obra_id, data_desmobilizacao, status, criado_por, concluido_por/at                                                                | obra_id→obras                                                                                                 |

### 4.2 Views

- `v_obra_orcamento_realizado` — orçado x realizado (material + MO) por item de orçamento.
- `v_colaborador_saldo` — saldo corrente por colaborador (confirmado/pendente).
- `v_estoque_saldo` — quantidade em estoque calculada dinamicamente a partir de
  `movimentacoes_estoque` (nunca armazenada diretamente).
- `v_contrato_mo_saldo` — saldo de contrato de MO (valor_confirmado/pendente/restante).

Todas com `security_invoker = true`.

### 4.3 Enums principais

`user_role` (`adm_geral`, `compras`, `gestor_obra`, `almox`), `solicitacao_status` (14
valores, incluindo `autorizada` — valor morto mantido no enum por comodidade, sem uso no
código de aplicação), `cotacao_status`, `aprovacao_status`, `pedido_status`,
`prioridade_solicitacao`, `obra_fase`, `obra_orcamento_tipo`, `lancamento_mo_tipo`,
`lancamento_mo_status`, `movimentacao_estoque_tipo`, `requisicao_almox_status`,
`contrato_mo_status`, `ferramenta_status`, `movimentacao_ferramenta_tipo`,
`cacamba_status`, `cacamba_acao_pendente`, `cacamba_evento_tipo`,
`solicitacao_servico_status`.

### 4.4 Storage (buckets)

- `pedidos-pdf` — privado, só PDF, limite 10MB.
- `anexos` — privado, limite 50MB.
- `avatars` — leitura pública, limite 5MB, PNG/JPEG/WEBP.

### 4.5 Funções helper de RLS (security definer)

`current_profile_cliente_id()`, `current_profile_role()`, `is_admin()`,
`same_cliente(uuid)`, `can_access_solicitacao(uuid)`.

### 4.6 Padrão de RLS

Toda tabela de negócio tem RLS habilitada, seguindo o padrão:
`same_cliente(cliente_id)` (isolamento multi-tenant) + `current_profile_role() in (...)`
(restrição por papel) + `is_admin()` como escape hatch para `adm_geral`.

Casos especiais:

- Tabelas de movimentação (`historico`, `movimentacoes_estoque`,
  `movimentacoes_ferramentas`, `cacamba_eventos`) são **insert-only** — sem update/delete.
- `contratos_mo` e `ferramentas` não têm policy de UPDATE nenhuma para clientes — a
  mudança de status só acontece via trigger `SECURITY DEFINER`, impedindo adulteração
  pelo lado da aplicação.
- `gestor_obra` é restrito às obras vinculadas via `obra_usuarios` em praticamente todos
  os módulos mais novos (compras, pagamento-mo, contratos, ferramentas, caçamba,
  desmobilização).

### 4.7 Seed / dados iniciais

- `supabase/seed/initial_client.sql` — insere o tenant inicial (`clientes`) com id fixo.
- `supabase/seed/bootstrap-admin.sql.example` — script manual (não roda sozinho) para
  vincular o primeiro usuário Auth criado no Studio ao papel `adm_geral`.
- `supabase/scripts/reset-dados-teste.sql` + `reset-auth-users.mjs` — utilitários manuais
  para resetar dados de teste (truncate + limpeza de usuários Auth via Admin API),
  preservando o catálogo global (`items`/`unidades`) por padrão.

---

## 5. Dependências e integrações

### 5.1 Bibliotecas principais e para que servem

| Pacote                                               | Uso                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `next`                                               | Framework (App Router, Server Actions, Route Handlers, middleware)                                      |
| `react` / `react-dom`                                | UI                                                                                                      |
| `@supabase/supabase-js` + `@supabase/ssr`            | Cliente de banco/auth/storage, com suporte a SSR via cookies                                            |
| `zod` + `react-hook-form` + `@hookform/resolvers`    | Validação e formulários                                                                                 |
| `@tanstack/react-table`                              | Tabelas de dados (compras, obras, usuários, etc.)                                                       |
| `@radix-ui/*` + shadcn/ui                            | Primitivas acessíveis de UI (dialog, dropdown, tabs, popover, avatar)                                   |
| `lucide-react`                                       | Ícones                                                                                                  |
| `cmdk`                                               | Command palette/busca                                                                                   |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Composição de classes Tailwind com variantes                                                            |
| `next-themes`                                        | Alternância dark/light                                                                                  |
| `react-day-picker`                                   | Seletor de datas                                                                                        |
| `date-fns`                                           | Manipulação de datas                                                                                    |
| `pdf-lib`                                            | Geração de PDFs (pedido de compra, relatórios de obra/estoque)                                          |
| `papaparse`                                          | Parsing de CSV (import de materiais/unidades)                                                           |
| `@anthropic-ai/sdk`                                  | Extração assistida por IA de dados de cotações de fornecedores (upload de arquivo → dados estruturados) |

### 5.2 Integrações externas / serviços de terceiros

- **Supabase** (hospedado) — banco Postgres, Auth, Storage, e (via MCP) ferramentas de
  administração do projeto durante o desenvolvimento.
- **Anthropic API** — usada em `services/ai-extraction-service.ts` para extrair dados
  estruturados de cotações enviadas pelos fornecedores (PDF/imagem → itens/preços).
- **WhatsApp** — não é uma integração de API oficial; o sistema apenas monta links
  `wa.me` com mensagens pré-formatadas (cotação, aprovação, pedido) e registra o clique
  no histórico via `/api/whatsapp/log`.

### 5.3 Variáveis de ambiente necessárias (nomes apenas)

| Variável                        | Uso                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | URL base do app (usada para montar links absolutos, ex. WhatsApp)                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do projeto Supabase                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública/anon do Supabase (cliente browser/SSR, respeita RLS)                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Chave service-role (cliente admin, ignora RLS — usado em `lib/supabase/admin.ts`) |
| `ANTHROPIC_API_KEY`             | Chave da API da Anthropic (extração de cotações)                                  |

Template disponível em `.env.example` (sem valores). Nenhuma outra variável de ambiente é
lida pelo código de aplicação (confirmado por busca de `process.env.*` em todo o repo).

---

## 6. O que falta fazer

Não há marcadores `TODO`/`FIXME` no código — os gaps abaixo vêm de funcionalidades
mencionadas/reservadas mas não construídas, e de itens documentados nos comentários das
migrations e no `docs/SISTEMA.md` (desatualizado).

### 6.1 Funcionalidades pendentes

- **Tela de Fornecedores (CRUD dedicado)** — hoje só existe como dropdown dentro do
  formulário de cotação; cadastro é manual via SQL/Supabase Studio. É a lacuna mais
  visível do sistema.
- **Módulo Clientes** — página é um stub ("Módulo reservado"); precisa de CRUD real
  quando o produto avançar para multi-tenant SaaS de fato.
- **Tela de histórico de movimentação de ferramentas** — a função de serviço
  `listMovimentacoesFerramenta` já existe mas não está conectada a nenhuma página.
- **Edição/cancelamento de Contratos de MO** — hoje só é possível criar e listar.
- **Edição/exclusão de itens em Materiais/Unidades** — hoje só criar e
  ativar/desativar.

### 6.2 Dívida a resolver

- **Regenerar `types/database.ts`** — cobre hoje apenas 3 das 30 tabelas e um `UserRole`
  de 3 valores (faltando `almox`). Recomenda-se gerar via
  `mcp__supabase__generate_typescript_types` (ferramenta MCP do Supabase já configurada
  em `.mcp.json`) e substituir os `as any` usados como contorno em `lib/permissions.ts`.
- **Atualizar `docs/SISTEMA.md`** — datado de 2026-07-09, não reflete os módulos de
  estoque/almoxarifado, ferramentas, contratos de MO, serviços de obra, nem o papel
  `almox`, todos adicionados entre 10 e 20/07.
- **Cobrir mais rotas no matcher de `middleware.ts`** — atualmente só
  `/dashboard`, `/clientes` e `/compras` estão no matcher de proteção; `/obras`,
  `/pagamento-mo`, `/estoque`, `/servicos`, `/usuarios`, `/materiais` não estão, embora
  cada página valide autenticação/permissão individualmente no server (não é uma brecha
  real, mas quebra a defesa em profundidade consistente do resto do middleware).

### 6.3 Próximos passos lógicos sugeridos (em ordem de prioridade)

1. Construir CRUD de Fornecedores (maior lacuna funcional, impacta o fluxo de compras).
2. Regenerar tipos do banco e remover os `as any` associados.
3. Atualizar `docs/SISTEMA.md` para refletir o estado real do sistema.
4. Adicionar tela de histórico de ferramentas (aproveitando serviço já pronto).
5. Considerar suíte de testes automatizados, hoje inexistente (ver seção 7).

---

## 7. Problemas conhecidos / dívida técnica

- **Sem testes automatizados** — nenhum arquivo de teste (`*.test.ts`, `*.spec.ts`,
  `__tests__/`), nenhum runner (Jest/Vitest/Playwright/Cypress) configurado no
  `package.json` ou no repo. Toda verificação hoje depende de `typecheck`/`lint` e teste
  manual.
- **`types/database.ts` desatualizado** — cobre só `profiles`, `user_permissions` e
  `obra_usuarios`, com `UserRole` de 3 valores (falta `almox`). Não é gerado
  automaticamente pelo Supabase (nenhum `database.types.ts` gerado encontrado). Isso leva
  a uso de `as any` em pontos da camada de serviço (ex. `lib/permissions.ts`) para
  contornar a falta de tipos — risco de erros silenciosos de tipagem.
- **Tabela `materiais` formalmente depreciada mas ainda presente** — substituída por
  `items`/`unidades` desde a migration `202607100005`, mantida apenas para leitura
  histórica (`solicitacao_itens.material_id`). Inserts nela são bloqueados por RLS. Código
  novo não deve gravar em `materiais` nem em `material_id` — usar sempre `items`/`item_id`.
  A coexistência das duas colunas em `solicitacao_itens` é um risco latente de uso
  incorreto.
- **Duplicação intencional de regras de autorização** (RLS + Server Action) — defesa em
  profundidade deliberada, mas historicamente já causou dessincronia real (ver bug #2
  abaixo). Qualquer nova regra de escopo por obra precisa ser replicada dos dois lados.
- **Workarounds documentados em `next.config.ts`**:
  - IP de LAN hardcoded (`allowedDevOrigins`) para testes via celular em rede local —
    específico da máquina/rede atual, vai quebrar para outros desenvolvedores/redes.
  - Limite de body de Server Action elevado para 6MB especificamente para permitir upload
    de foto de perfil (até 5MB).
  - Cache do webpack desabilitado em modo dev (`config.cache = false`) porque o projeto
    vive dentro de uma pasta sincronizada pelo OneDrive, que trava arquivos temporários
    durante o sync e quebra o rename do cache persistente do webpack. Troca velocidade de
    rebuild por estabilidade; pode ser removido se o projeto for movido para fora de uma
    pasta sincronizada por nuvem (nota: o projeto foi de fato movido recentemente por
    esse mesmo tipo de conflito do OneDrive).
- **Enum morto** — `solicitacao_status` mantém o valor `autorizada`, sem uso no código de
  aplicação atual; não vale a pena recriar o tipo só para removê-lo, mas é uma pegadinha
  para quem for iterar sobre os valores do enum.
- **`docs/SISTEMA.md` desatualizado** — ver seção 6.

### 7.1 Bugs históricos já corrigidos (contexto útil, não são pendências)

Documentados nos próprios comentários das migrations — relevantes porque mostram padrões
de erro que podem se repetir em código novo:

1. **IDOR em RLS de `solicitacoes`** (`202607120001`) — a policy original só checava
   `same_cliente`, permitindo que qualquer `gestor_obra` visse e editasse solicitações de
   qualquer outro gestor da mesma empresa (incluindo abrir `/compras/[id]` de obra
   alheia). Corrigido com `responsavel_obra_id` + `can_access_solicitacao()`.
2. **Bug de tautologia em subquery `EXISTS`** (`202607120006`) — ao corrigir o bug
   acima, uma nova policy comparava `obra_usuarios.obra_id = obra_id` dentro do próprio
   `EXISTS`, onde `obra_id` (sem qualificador) resolvia para a própria tabela
   `obra_usuarios`, virando uma tautologia sempre verdadeira. Na prática, qualquer
   `gestor_obra` vinculado a qualquer obra podia criar solicitação para qualquer outra
   obra. **Vale auditar outras policies novas para o mesmo padrão de coluna não
   qualificada dentro de subquery.**
3. **RLS ausente em `user_permissions` e `obra_usuarios`** (`202607090001`) — essas
   tabelas não tinham RLS nenhuma, permitindo leitura/escrita cross-tenant.
4. **Policy de SELECT faltando no bucket `avatars`** (`202607180006`) — como o upload de
   foto usa `upsert: true` (INSERT ... ON CONFLICT), o Postgres precisa poder ler a linha
   existente para resolver o conflito; sem SELECT, todo upload de foto própria falhava
   com "permission denied".
5. **Cast de enum faltando em trigger** (`202607180005`) — um `CASE` sem cast explícito
   para o enum `ferramenta_status` era resolvido como `text` pelo Postgres e rejeitado ao
   atribuir a uma coluna enum. Lição reaproveitada explicitamente no trigger de
   `cacamba_eventos` (`202607180007`).

---

## 8. Como rodar o projeto

### 8.1 Instalação

```bash
npm install
```

### 8.2 Configuração do Supabase

1. Criar um projeto hospedado em https://app.supabase.com.
2. No Dashboard do projeto, copiar: `Project URL`, `anon/public key`, `service_role key`.
3. Criar os buckets de Storage: `anexos`, `pedidos-pdf` (o bucket `avatars` também é
   necessário para foto de perfil — ver migrations de storage).
4. Preencher `.env.local` (baseado em `.env.example`):
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ANTHROPIC_API_KEY=<anthropic-key>
   ```
5. Executar **todas** as migrations de `supabase/migrations/` no SQL Editor do Supabase,
   **em ordem cronológica pelo nome do arquivo** (32 arquivos, de `202606290001` até
   `202607180007`). Atenção: o `README.md` do projeto lista apenas um subconjunto mais
   antigo (até `202607090001`) — está desatualizado; rodar a pasta inteira.
6. Executar a seed inicial: `supabase/seed/initial_client.sql`.
7. Criar o primeiro usuário administrador:
   - Em Authentication > Users no Supabase Studio, criar usuário com e-mail/senha.
   - Seguir o roteiro de `supabase/seed/bootstrap-admin.sql.example` (substituindo os
     placeholders) para vincular esse usuário ao papel `adm_geral`.
   - Não existe login de desenvolvimento sem conta real — todo acesso passa pela
     autenticação normal do Supabase.

### 8.3 Rodando localmente

```bash
npm run dev          # servidor de desenvolvimento
npm run build         # build de produção
npm run start          # servidor de produção (após build)
npm run lint            # ESLint
npm run format           # Prettier --write
npm run format:check      # Prettier --check
npm run typecheck          # tsc --noEmit
```

### 8.4 Deploy

Nenhuma configuração de deploy/CI foi encontrada no repositório (sem `vercel.json`,
`Dockerfile` ou workflows de GitHub Actions) — presumivelmente implantado manualmente em
uma plataforma compatível com Next.js (ex. Vercel), mas isso não está documentado no
projeto. **Lacuna de documentação a preencher se o deploy for formalizado.**
