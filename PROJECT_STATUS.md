# PROJECT_STATUS.md — UNA Flow

> Relatório técnico do estado atual do projeto, gerado a partir de análise completa do
> código-fonte, estrutura de pastas, dependências, migrations e histórico de commits.
> Análise original: 2026-07-20. Reauditoria completa: 2026-09-12 — cobriu integralmente os
> ~44 commits e as 35 migrations novas produzidas entre 2026-07-28 e 2026-09-11, além do
> working tree no momento da auditoria; todo o documento (seções 0-8) foi reescrito
> naquela data para refletir o estado real. Em 2026-09-14, mais uma sessão relevante
> (renomeação para "UNA Flow" + correção de bug de cotação + correção de lentidão) foi
> registrada na Seção 0 abaixo, sem reescrever o resto do documento — seções 1-8 seguem
> confiáveis a partir de 2026-09-12, com pequenos ajustes pontuais já refletidos onde
> relevante (ex.: RLS otimizada, seção 4.3).

---

## 0. Estado da sessão (2026-09-14) — LER PRIMEIRO ao continuar em nova conversa

### Sessão de 2026-09-14 — rename, bugfix de cotação e correção de lentidão

- **Rename "UNA Compras" → "UNA Flow"**: título/metadata (`app/layout.tsx`), manifest do
  PWA (`app/manifest.ts`), `package.json`/`package-lock.json` (`una-flow`),
  `lib/constants.ts` (`APP_NAME`), alt da logo (`components/brand-logo.tsx`), health check
  (`app/api/health/route.ts`), `README.md`, `docs/SISTEMA.md`. Nome do cliente real ("UNA
  Reforma e Construção") não muda — é um tenant, não o produto.
- **Bug de cotação com item sem preço** (`features/compras/actions/purchase-actions.ts`,
  `features/compras/components/valor-unitario-total-input.tsx`): o campo "Total" do par
  Unitário/Total nunca é enviado ao servidor sozinho — só recalcula e escreve no campo
  Unitário via JS a cada tecla. Se esse recálculo falhasse por qualquer motivo, ou o
  usuário confundisse "Total" (valor da linha = Qtd × Unitário) com "preço por unidade",
  o item era salvo silenciosamente com preço nulo e total R$0,00, sem nenhum aviso.
  `salvarCotacao`/`validarCotacao` agora recusam salvar se algum item incluído (e não
  marcado "Não cotado") ficar sem preço > 0, com mensagem clara. Adicionada dica no
  formulário: "Total = Qtd. × Unitário".
- **Correção de lentidão geral do sistema** — dois achados reais, confirmados via
  advisors do Supabase (MCP) e leitura do código:
  1. **RLS reavaliando `auth.uid()` por linha** (advisor WARN "Auth RLS Initialization
     Plan", 19 policies) — corrigido envolvendo em `(select auth.uid())` nas policies que
     chamavam a função diretamente (a maioria delas do fluxo `gestor_obra` com
     `EXISTS (... obra_usuarios ...)`, adicionado em 2026-09-10). Fica mais caro conforme
     as tabelas crescem — provável causa raiz da lentidão percebida.
  2. **Policies permissivas duplicadas** (advisor WARN "Multiple Permissive Policies", 70
     casos em 12 tabelas) — várias tabelas tinham uma policy `FOR ALL` administrativa e
     uma policy de `SELECT` separada mais ampla que já cobria tudo; Postgres avaliava as
     duas em todo SELECT. Dividido cada `FOR ALL` em policies de `insert`/`update`/
     `delete` (Postgres não aceita mais de um comando explícito por policy). Em
     `colaboradores` e `profiles` havia sobreposição real (não redundância) de
     `INSERT`/`UPDATE` entre grupos de role diferentes — mescladas numa única policy por
     comando com `OR`, preservando o mesmo acesso combinado.
  3. **Canal global de Realtime** (`components/realtime/global-realtime-refresh.tsx`)
     ouvia a tabela `historico`, que recebe uma linha em praticamente toda ação do
     sistema — cada ação disparava `router.refresh()` pra todo mundo conectado sem
     necessidade, já que a tabela de negócio que a ação realmente mudou já dispara o
     mesmo refresh sozinha. `historico` removida da lista de tabelas observadas.
  - Migration `supabase/migrations/202609140001_optimize_rls_performance.sql` **já
    aplicada no banco real** via MCP (`apply_migration`), confirmada com
    `get_advisors(type=performance)`: os dois WARNs resolvidos, restam só INFOs
    pré-existentes (FK sem índice, índice não usado — não são a causa da lentidão,
    ficaram de fora desta rodada por serem infraestrutura de queries específicas, não
    RLS). `get_advisors(type=security)` confirmado sem regressão (mesmos avisos
    pré-existentes de antes da migration, nenhum novo).
  - Nenhuma regra de acesso mudou nessa correção — é reorganização de como o Postgres
    calcula o mesmo resultado, não mudança de permissão.
- Commits: `Bloqueia cotação com item incluído sem preço registrado`,
  `Corrige lentidão: otimiza RLS e reduz refresh global do Realtime` — ambos já no
  `origin/main`.

---

## 0-B. Estado da sessão (2026-09-12) — reauditoria completa anterior

### Reauditoria completa desta sessão

O projeto cresceu muito desde a última atualização registrada (2026-07-28): **~44 commits
novos** e a pasta `supabase/migrations/` foi de 32 para **67 arquivos**. Esta sessão fez uma
varredura completa (migrations, commits/código, estrutura de repo) e reescreveu o documento
inteiro. Versão do app hoje (`lib/version.ts`): **1.28**. Resumo do que mudou, por tema — o
detalhe de cada item está nas seções correspondentes abaixo:

- **PWA de verdade**: `app/manifest.ts`, `public/sw.js` (service worker "passthrough", sem
  cache — deliberado, é um dashboard CRUD ao vivo, cache mostraria dado velho),
  `components/pwa-register.tsx`, ícones em `public/icons/`, splash iOS. Implementado à mão,
  sem lib (`next-pwa` não é dependência).
- **Links curtos** (`short_links` + `app/l/[code]/route.ts`): substitui signed URLs gigantes
  do Storage nas mensagens de WhatsApp (PDF de cotação/pedido, aprovação).
- **Despesas manuais** (`despesas_manuais`): lançamento financeiro livre contra qualquer
  centro de custo da obra, fora do fluxo de Compras/serviços; só `adm_geral`/`compras`.
- **Rate limiting em Postgres** (`rate_limit_hits` + função `check_rate_limit`,
  `lib/rate-limit.ts`): login, aprovação pública, extração por IA, log de WhatsApp,
  resolução de link curto. Falha aberta (libera a requisição) se a checagem falhar.
- **Supabase Realtime habilitado** em ~27 tabelas de negócio
  (`components/realtime/global-realtime-refresh.tsx`, um único canal no layout do
  dashboard, `router.refresh()` com debounce de 500ms a qualquer mudança visível via RLS).
- **Ferramentas ganhou fluxo de locação externa**: além do empréstimo interno de sempre
  (`/estoque/ferramentas`), agora existe `/servicos/ferramentas` — gestor solicita
  (`ferramenta_solicitacoes`, com data de necessidade e período de uso), compras decide
  entre atender do depósito ou locar de um fornecedor (WhatsApp obrigatório antes de
  confirmar entrega, devolução com soft-delete, relatório PDF agrupado por fornecedor,
  popup de lembrete de vencidas).
- **Caçambas ganharam fornecedor e estágio "pendente"**: `pendente` (aguardando WhatsApp)
  → `solicitada` → `ativa` → `encerrada` (arquivada por padrão), com detalhe clicável e
  histórico completo de eventos, popup de lembrete de vencidas.
- **Fluxo de Compras reestruturado na UI**: os ~14 status internos do enum continuam
  existindo, mas listagem/dashboard agrupam em 4 etapas visíveis + 2 desfechos negativos
  (Nova Solicitação → Em Cotação → Pedido Aprovado → Finalizado, + Cancelada/Recusada),
  com cor por grupo. **Aprovação dividida por fornecedor** (um pedido/PDF por fornecedor
  escolhido, `solicitacao_itens.fornecedor_aprovado_id`). Desconto em % ou R$ na cotação.
  Itens em cards. PDF do pedido reestruturado.
- **Pagamento de MO renomeado para "Solicitação de Pagamento"**, com sub-rota nova
  **"Pagos"** (arquivamento de confirmados, agrupados por prestador). Confirmação permite
  liberar valor diferente do pedido — a sobra vira novo lançamento pendente automaticamente.
  `gestor_obra` não vê mais nada já confirmado (reforçado por RLS).
- **Materiais/Unidades ganhou edição e exclusão de itens** (inclusive em massa) — a linha
  da seção 3.1/6.1 antiga que dizia "sem edição nem exclusão" **está desatualizada e foi
  corrigida** nesta versão.
- **Auditoria de segurança em 2026-08-08** (commit `c482616`): corrigiu RLS de `clientes`
  (tenant isolation quebrada para `adm_geral`), parou de confiar em `cliente_id`/
  `fornecedor_id` vindos do form na aprovação pública, corrigiu uma injeção no filtro
  `.or()` de busca de `listSolicitacoes`, adicionou headers de segurança
  (`next.config.ts`: HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy) e rate limiting nas rotas públicas.
- **Correção de RLS em 2026-09-10** (`202609100002_gestor_obra_select_rls.sql`): SELECT de
  `lancamentos_mo`, `contratos_mo`, `cacambas`, `cacamba_eventos`,
  `solicitacoes_desmobilizacao` e `ferramenta_solicitacoes` não restringia `gestor_obra`
  às obras vinculadas (só o INSERT restringia) — qualquer gestor autenticado conseguia ler
  esses dados de qualquer obra da empresa via API direta. Corrigido. Ver novos itens #6 e
  #7 na lista de bugs históricos (seção 7.1).
- **Dívidas antigas resolvidas**: `types/database.ts` está completo e atualizado (2662
  linhas, cobre as 32 tabelas + views + RPCs — a regeneração via MCP já tinha sido feita
  antes de 2026-07-28 e segue mantida manualmente linha a linha desde então); o matcher de
  `middleware.ts` hoje protege praticamente todas as rotas autenticadas (só exclui assets
  estáticos, `manifest.webmanifest` e `sw.js`) — a lacuna documentada antes está resolvida.

### Trabalho em andamento no working tree (não commitado) no momento desta auditoria

Duas frentes distintas coexistindo sem relação direta entre si:

1. **Feature "prazo de pagamento na aprovação"** — migration nova (ainda não commitada)
   `supabase/migrations/202609110001_aprovacoes_prazo_pagamento.sql` adiciona
   `aprovacoes.prazo_pagamento text`. Código já implementado e consistente com ela:
   `types/database.ts`, `features/compras/components/aprovacao-decisao.tsx` (campo de
   texto livre no formulário público, ex. "30 dias, 3x sem juros"),
   `features/compras/actions/purchase-actions.ts::registrarDecisaoPublica` (grava só
   quando `decisao === "autorizar"`), `app/(dashboard)/compras/[id]/page.tsx` (exibe o
   prazo no card de detalhe). **Não entra no PDF**, é só informação interna. **Pendência
   real**: aplicar a migration no banco (ver "particularidades do ambiente" abaixo) e
   commitar.
2. **Passe de responsividade/acessibilidade mobile** (15 arquivos, sem relação com o item
   1. — touch targets maiores (`button.tsx`, `calendar.tsx`, `sidebar-nav.tsx`), dialogs
      que não cortam em tela pequena (`max-h-[90dvh] overflow-y-auto`), tabs que quebram
      linha, popovers com largura responsiva, toast dispensável com `aria-live` e botão de
      fechar, inputs sem zoom automático do iOS (`font-size: 16px` global abaixo de 640px),
      formulários inline virando coluna em mobile. Arquivos: `app/globals.css`,
      `app/layout.tsx`, `components/ui/{button,calendar,dialog,tabs,form-toast}.tsx`,
      `components/layout/sidebar-nav.tsx`, `app/(dashboard)/obras/[id]/page.tsx`,
      `app/(dashboard)/pagamento-mo/page.tsx`, `features/compras/components/{desconto-input,
valor-unitario-total-input,solicitacao-item-row}.tsx`,
      `features/materiais/components/catalogo-table.tsx`,
      `features/pagamento-mo/components/lancamento-form.tsx`.

Seguindo a preferência já registrada do usuário, ao commitar isso deve virar **pelo menos
dois commits separados** (prazo de pagamento / polimento mobile), não um único commit
misturando os dois temas. Também há `CLAUDE.md` (este arquivo de convenção) como untracked.

### Particularidades do ambiente (aprendidas na marra — vale saber antes de tentar de novo)

- **Não há acesso a execução de SQL/DDL direto neste ambiente**: sem Supabase CLI
  funcional no Windows (`No matching Supabase CLI binary package found for win32-x64`),
  sem `psql`, sem `pg`/`DATABASE_URL`. O MCP do Supabase às vezes conecta, às vezes não,
  nesta sessão — **sempre confirmar com `ToolSearch` (query `mcp__supabase`) se as
  ferramentas realmente estão disponíveis antes de assumir que sim**, mesmo que o usuário
  diga que conectou. Quando não está disponível, a única via pra DDL é pedir pro usuário
  colar SQL no SQL Editor do painel do Supabase manualmente.
- **Operações de dado (select/insert/update/delete) via API funcionam sempre**, mesmo sem
  MCP: usar `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY` (de `.env.local`) num
  script `.mjs` descartável na raiz do projeto (pra `node_modules` resolver), rodado via
  `node`, apagado depois. `dotenv` já é devDependency; carregar com
  `config({ path: ".env.local" })` (o `.env.local` tem prioridade sobre `.env`, então
  `dotenv/config` sozinho não pega os valores certos).
- **`historico` é append-only por trigger** (`prevent_historico_delete`/`update`
  levantam exceção sempre) — isso bloqueia até updates _indiretos_ via
  `ON DELETE SET NULL` em cascata (ex.: apagar um `profiles` referenciado por
  `historico.actor_id` falha, porque o Postgres tenta fazer `UPDATE historico SET
actor_id = null` como parte do cascade). Só dá pra contornar desabilitando os 2
  triggers via SQL manual, fazendo a operação, e reabilitando. O mesmo padrão vale hoje
  para outras tabelas append-only novas (`movimentacoes_ferramentas`, `cacamba_eventos`,
  `movimentacoes_estoque`, `historico`).
- **OneDrive trava arquivos intermitentemente** (`package-lock.json`,
  `tsconfig.tsbuildinfo`, `.next/prerender-manifest.json`, e até
  `.git/COMMIT_EDITMSG` com atributo Hidden inesperado bloqueando o `git commit` do
  hook do Husky/lint-staged) — geralmente resolve deletando o arquivo/pasta específico e
  deixando regenerar, ou (caso do `COMMIT_EDITMSG`) rodando
  `attrib -H -A .git\COMMIT_EDITMSG` via PowerShell antes de tentar de novo.
  `next.config.ts` já desabilita o cache do webpack em dev por causa disso (ver seção 7).
- **Login de teste real**: `victorjbinello@gmail.com` / `121298` (fornecido
  explicitamente pelo usuário pra testes com Playwright). Playwright + Chromium já estão
  instalados como devDependency. Vitest também está configurado (`npm run test`).
- **Ao acumular várias features sem commit**, o padrão preferido pelo usuário é dividir
  em vários commits pequenos por feature/tema (não um commit gigante) — ver
  `git log --oneline` pra exemplos de mensagens no estilo certo (em português, no
  imperativo/descritivo curto, ex. "Adiciona X", "Corrige Y", "Simplifica Z").
- **Bump de versão manual**: `lib/version.ts` (`APP_VERSION`) é incrementado manualmente
  pelo usuário toda vez que pede pra "subir pro git" — não é automático, não mexer sem
  pedido explícito.

---

## 1. Visão geral do projeto

**Nome:** UNA Flow (renomeado de "UNA Compras" em 2026-09-12 — nome interno do
`package.json`: `una-flow`; título/manifest do PWA, logo e health check atualizados
juntos).

**Objetivo/propósito:** Painel interno de gestão para uma construtora (cliente real
atual: "UNA Reforma e Construção") cobrindo o ciclo de compras (solicitação → cotação →
aprovação dividida por fornecedor → pedido → PDF), gestão de obras (orçamento com 4 tipos
de centro de custo, fases, dados do contratante, orçado x realizado), controle de
materiais/estoque/almoxarifado, pagamento de mão de obra (avulsa e por contrato), controle
de ferramentas (empréstimo interno **e locação de fornecedor externo**), serviços de obra
(caçamba de entulho com fornecedor, desmobilização) e despesas manuais avulsas por obra.

O sistema foi arquitetado desde o início para evoluir de uma solução single-tenant para
um **SaaS multi-tenant**: quase toda tabela de negócio tem uma coluna `cliente_id` e RLS
que isola dados por tenant, embora hoje exista apenas um tenant real em produção.

**Público-alvo:** Equipe interna de uma construtora — administradores gerais, setor de
compras/administrativo, gestores de obra (acesso restrito às obras vinculadas, hoje
reforçado por RLS em praticamente todos os módulos) e almoxarifado. Não há tela voltada a
clientes externos, exceto a página pública de aprovação de cotação por token e a página
pública de resolução de link curto (`/l/[code]`), ambas sem exigir login.

Instalável como **PWA** (manifest + service worker sem cache, ícones e splash próprios).

**Stack tecnológica completa:**

| Camada             | Tecnologia                                                                                                                                              | Versão             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Framework          | Next.js (App Router, `typedRoutes: true`)                                                                                                               | ^15.4.6            |
| Linguagem          | TypeScript (strict mode, target ES2017)                                                                                                                 | ^5.8.3             |
| UI runtime         | React / React DOM                                                                                                                                       | ^19.1.0            |
| Estilo             | TailwindCSS + `tailwindcss-animate`                                                                                                                     | ^3.4.17            |
| Componentes        | shadcn/ui (estilo `new-york`, cor base `zinc`, RSC habilitado) sobre Radix UI (`avatar`, `dialog`, `dropdown-menu`, `label`, `popover`, `slot`, `tabs`) | —                  |
| Ícones             | lucide-react (com `optimizePackageImports` no Next config)                                                                                              | ^0.468.0           |
| Command/busca      | cmdk                                                                                                                                                    | ^1.1.1             |
| Formulários        | react-hook-form + @hookform/resolvers                                                                                                                   | ^7.62.0 / ^5.2.1   |
| Validação          | zod                                                                                                                                                     | ^4.0.17            |
| Tabelas            | @tanstack/react-table                                                                                                                                   | ^8.21.3            |
| Datas              | date-fns, react-day-picker                                                                                                                              | ^4.4.0 / ^10.0.1   |
| Tema               | next-themes (dark/light)                                                                                                                                | ^0.4.6             |
| Banco/Auth/Storage | Supabase (`@supabase/supabase-js`, `@supabase/ssr`)                                                                                                     | ^2.110.7 / ^0.12.3 |
| PWA                | manifest (`app/manifest.ts`) + service worker manual (`public/sw.js`, passthrough sem cache) — sem lib dedicada                                         | —                  |
| IA                 | @anthropic-ai/sdk (extração de dados de cotações)                                                                                                       | ^0.110.0           |
| PDF                | pdf-lib                                                                                                                                                 | ^1.17.1            |
| CSV                | papaparse                                                                                                                                               | ^5.5.4             |
| Testes             | vitest (integração), playwright (E2E/manual)                                                                                                            | ^2.1.9 / ^1.61.1   |
| Lint/format        | ESLint (`eslint-config-next`), Prettier + `prettier-plugin-tailwindcss`                                                                                 | ^8.57.1 / ^3.6.2   |
| Git hooks          | Husky + lint-staged                                                                                                                                     | ^9.1.7 / ^15.5.2   |

Não há ORM tradicional — todo acesso ao banco é via SDK do Supabase (`supabase-js`)
usando três "clientes" diferentes conforme o contexto (browser, SSR/cookies, admin com
service role), com tipos mantidos manualmente (não gerados automaticamente a cada mudança)
em `types/database.ts`, hoje cobrindo o schema completo (32 tabelas + views + RPCs).

Suíte de testes existe (`vitest` para integração contra um tenant descartável via
service-role, cobrindo RLS/triggers historicamente problemáticos; `playwright` instalado
para testes manuais/E2E), mas não é abrangente — cobre principalmente os pontos que já
tiveram bugs de RLS no passado, não o sistema inteiro.

---

## 2. Arquitetura

### 2.1 Estrutura de pastas (árvore comentada, atualizada)

```
.
├── .agents/                  # Cache local de "skills" de agente (supabase, etc.) — tooling, não é código da app
├── .claude/                  # Config do Claude Code (settings, skills espelhadas)
├── .husky/                   # Git hook pre-commit (roda lint-staged)
├── .env.example              # Template das variáveis de ambiente (sem valores)
├── .env.local                # Variáveis reais locais (não versionado)
├── .eslintrc.json            # ESLint: next/core-web-vitals + next/typescript
├── .mcp.json                 # Config do MCP do Supabase (project_ref iguixokrvatlyajnldqv)
├── .prettierrc               # Prettier: aspas duplas, trailing commas, plugin Tailwind
├── CLAUDE.md                  # Convenção do projeto (referencia este arquivo, pede atualização da Seção 0)
├── README.md                 # Instruções de setup (em português)
├── vercel.json                # Deploy Vercel: 1 cron job (limpeza de PDFs/links vencidos)
├── docs/
│   └── SISTEMA.md            # Documentação interna do sistema — desatualizada (não reflete os módulos mais recentes; não foi reauditada nesta sessão)
├── scripts/
│   └── generate-pwa-icons.ps1  # Gera os ícones do PWA a partir de public/pwa.png (sem dependência nova)
├── app/                       # Next.js App Router: rotas, layouts, Route Handlers
│   ├── manifest.ts             # Manifest do PWA (nome, ícones, display standalone)
│   ├── apple-icon.png
│   ├── (auth)/login/          # Tela de login (fora do grupo autenticado)
│   ├── (dashboard)/           # Grupo de rotas autenticadas, com layout de sidebar/header + canal Realtime global
│   │   ├── clientes/          # STUB — "Módulo reservado", sem CRUD
│   │   ├── compras/           # Fluxo de compras: lista (4 grupos de status), nova solicitação, detalhe/workflow
│   │   ├── dashboard/         # Home, role-aware, cards clicáveis como filtros
│   │   ├── estoque/           # Estoque: níveis, entrada/saída, requisições, relatório, ferramentas (empréstimo interno)
│   │   ├── fornecedores/      # CRUD de fornecedores
│   │   ├── materiais/         # Catálogo de itens/unidades (criar/editar/excluir, inclusive em massa) + import CSV de itens
│   │   ├── obras/             # CRUD de obras (com dados do contratante), orçamento (4 tipos), despesas manuais, orçado x realizado
│   │   ├── pagamento-mo/      # Solicitação de Pagamento (+ Pagos, Colaboradores, Contratos de MO)
│   │   ├── servicos/          # Caçamba de entulho (com fornecedor), desmobilização, solicitação/locação de ferramentas
│   │   └── usuarios/          # Gestão de usuários e permissões (só adm_geral)
│   ├── aprovacao/[token]/     # Rota PÚBLICA (sem login) de aprovação de cotação por token, dividida por fornecedor
│   │   └── concluida/          # Tela de confirmação pós-decisão
│   ├── l/[code]/               # Rota PÚBLICA de resolução de link curto (redirect para signed URL real)
│   └── api/                   # Route Handlers
│       ├── health/
│       ├── whatsapp/log/       # Log fire-and-forget de clique em link do WhatsApp
│       ├── obras/[id]/relatorio/   # PDF de orçado x realizado da obra
│       ├── estoque/relatorio/      # PDF de relatório de estoque
│       ├── ferramentas/locadas/relatorio/  # PDF de ferramentas locadas, agrupado por fornecedor
│       └── cron/cleanup-pdfs/       # Chamado pelo Vercel Cron (03:00 UTC diário) — apaga PDFs/links vencidos (90 dias)
├── components/                 # UI compartilhada e não específica de domínio
│   ├── ui/                     # Primitivas shadcn/ui (button, dialog, data-table, mobile-card-list, etc.)
│   ├── layout/                 # Sidebar, header, mobile-nav, theme-toggle, user-menu
│   ├── realtime/                # global-realtime-refresh.tsx — canal único de Supabase Realtime, refresh debounced
│   └── pwa-register.tsx        # Registra o service worker (só em produção)
├── features/                    # Módulos de domínio (organização feature-based)
│   └── <dominio>/                # auth, compras, dashboard, estoque, ferramentas, fornecedores, materiais,
│       ├── components/           #   obras, pagamento-mo, perfil, servicos-obra, usuarios
│       ├── actions/               # Server Actions ("use server") — mutações
│       ├── schemas/               # Validação Zod (existe só em alguns domínios)
│       └── utils/
├── services/                    # Camada de acesso a dados/regras de negócio server-side
│   ├── ai-extraction-service.ts  # Extração de dados de cotação via Anthropic SDK (casamento de item por ID)
│   ├── compras-service.ts, estoque-service.ts, ferramentas-service.ts,
│   ├── historico-service.ts, obras-service.ts, pagamento-mo-service.ts,
│   ├── pdf-service.ts, profiles-service.ts, request-context.ts,
│   ├── servicos-obra-service.ts, short-link-service.ts, whatsapp-service.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Cliente browser
│   │   ├── server.ts             # Cliente SSR/cookie-based (cacheado por request), respeita RLS
│   │   ├── admin.ts              # Cliente service-role (ignora RLS — uso admin/token público/link curto)
│   │   └── middleware.ts         # Refresh de sessão + lista de protectedRoutes (praticamente todas as rotas autenticadas)
│   ├── rate-limit.ts              # Wrapper de checkRateLimit() sobre a RPC Postgres check_rate_limit; falha aberta
│   ├── permissions-shared.ts     # Tipos/regras de permissão puros (client-safe)
│   ├── permissions.ts             # Wrapper server-only (usa next/headers) sobre permissions-shared
│   ├── require-actor.ts           # Guard padrão usado nas Server Actions
│   ├── env.ts, constants.ts, obras-constants.ts, date-range.ts, error-message.ts, form-data.ts, version.ts
├── middleware.ts                 # Middleware Next.js — matcher exclui só assets estáticos, manifest.webmanifest e sw.js
├── hooks/                        # use-item-search.ts, use-mounted.ts
├── types/database.ts              # Tipos mantidos manualmente — cobre as 32 tabelas + 4 views + funções RPC
├── utils/cn.ts                    # Merge de classes Tailwind
├── public/                        # Assets estáticos: logo, ícones do PWA (public/icons/), apple-splash.png, sw.js
└── supabase/
    ├── migrations/                 # 67 arquivos SQL (schema, RLS, triggers, views, buckets, realtime)
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
      → (opcional) checkRateLimit(...) [lib/rate-limit.ts] em pontos sensíveis/públicos
      → Service (services/*-service.ts) — regra de negócio + query
         → Supabase client (lib/supabase/server.ts, respeitando RLS)
   → revalidatePath / redirect
```

Um punhado de **Route Handlers** (`app/api/*/route.ts`) existe para casos que não se
encaixam bem em Server Actions: geração de PDF para download, health check, log
fire-and-forget de cliques do WhatsApp, resolução pública de link curto (`app/l/[code]`) e
o endpoint chamado pelo cron da Vercel.

Não há evidência de componentes client-side chamando o Supabase diretamente para
mutações — o fluxo é consistentemente Component → Action → Service → Supabase. A única
exceção é o **canal de Realtime** (`components/realtime/global-realtime-refresh.tsx`),
que assina `postgres_changes` diretamente do browser (somente leitura de eventos, sem
mutação) para disparar `router.refresh()` quando qualquer uma de ~27 tabelas de negócio
muda — a RLS de cada tabela continua sendo o que decide quais eventos cada usuário recebe.

**Defesa em profundidade deliberada:** regras de autorização críticas (ex.: um
`gestor_obra` só pode agir em obras vinculadas a ele via `obra_usuarios`) são
implementadas **duas vezes** — uma vez na Server Action (mensagens de erro amigáveis) e
uma vez em RLS/triggers no Postgres (garantia real, já que todo acesso ao banco usa o
cliente autenticado da sessão, não service role). Isso é intencional e documentado nos
comentários das migrations, mas já causou dessincronia real mais de uma vez — ver seção 7.1
para o histórico completo (7 casos documentados até agora, o mais recente em 2026-09-10).

**Autenticação/autorização:**

- Supabase Auth (e-mail/senha), sessão via cookies (`@supabase/ssr`), refresh no
  `middleware.ts`, cliente SSR cacheado por request (`lib/supabase/server.ts`).
- 4 papéis fixos: `adm_geral` (acesso total), `compras` (administrativo), `gestor_obra`
  (escopo limitado às obras vinculadas), `almox` (almoxarife, foco em estoque).
- Permissões granulares (40+ `PermissionKey`s) com padrão por papel e overrides por
  usuário em `user_permissions`.
- `requireActor(permissão)` é o guard padrão chamado no início de quase toda Server Action.
- RLS no Postgres espelha as mesmas regras (`same_cliente()`, `is_admin()`,
  `can_access_solicitacao()`, `current_profile_role()`, `current_profile_cliente_id()`)
  como camada de garantia independente da aplicação; desde 2026-09-10 o padrão
  "SELECT também restrito por `obra_usuarios` quando `gestor_obra`" foi uniformizado em
  praticamente todas as tabelas com escopo de obra.
- Rate limiting em Postgres (`check_rate_limit`, tabela `rate_limit_hits`) protege rotas
  públicas/sensíveis: login, aprovação pública, extração por IA, log de WhatsApp,
  resolução de link curto.
- Fluxos públicos sem login: `/aprovacao/[token]` (token de 32 bytes, expiração 14 dias,
  cliente admin) e `/l/[code]` (link curto de 5 bytes base64url, cliente admin) — ambos
  revalidam dados sensíveis no servidor em vez de confiar no que vem do form/URL.

---

## 3. Funcionalidades implementadas

### 3.1 Por módulo, com status

| Módulo                                        | Rotas principais                                                                                      | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compras**                                   | `/compras`, `/compras/nova`, `/compras/[id]`, `/aprovacao/[token]`(+`/concluida`)                     | **Completo, módulo mais maduro, reestruturado desde jul/2026.** Enum interno de status continua com ~14 valores, mas listagem/dashboard agrupam em 4 etapas visíveis + 2 desfechos (Nova Solicitação → Em Cotação → Pedido Aprovado → Finalizado/arquivado, + Cancelada/Recusada), com cor por grupo. **Aprovação dividida por fornecedor** (um pedido/PDF por fornecedor escolhido, item a item). Desconto por % ou R$ na cotação, itens em cards, casamento de item por ID na extração por IA, hub da obra com abas, PDF reestruturado, gestor pode editar solicitação enquanto não avançou, recusa com reenvio, prazo de pagamento (em finalização, ver Seção 0). |
| **Obras**                                     | `/obras`, `/obras/nova`, `/obras/[id]`                                                                | **Completo.** Cadastro agora exige dados do contratante (nome/documento/e-mail/telefone). Orçamento com 4 tipos de item: insumos, mão de obra, extra (seguro/ART/impostos) e um `servicos` órfão de uso real (ver seção 7). **Despesas manuais** por obra, lançadas direto contra qualquer item de orçamento. Relatório orçado x realizado (tela + PDF) soma compras, MO, caçambas e despesas manuais. Sem tela dedicada de "editar obra" (edição é inline).                                                                                                                                                                                                         |
| **Materiais/Unidades**                        | `/materiais`, `/materiais/unidades`, `/materiais/importar`                                            | **Completo.** Criar, **editar e excluir** itens (inclusive em edição/exclusão em massa) e unidades; import em massa via CSV (só itens — a importação de unidades via CSV foi removida).                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Pagamento de MO (lançamentos)**             | `/pagamento-mo`, `/pagamento-mo/novo`, `/pagamento-mo/pagos`, `/pagamento-mo/colaboradores`(+`/[id]`) | **Completo, renomeado na sidebar para "Solicitação de Pagamento".** Pendentes por padrão em `/pagamento-mo`; confirmados arquivados em `/pagamento-mo/pagos`, agrupados por prestador com histórico em `/pagamento-mo/colaboradores/[id]`. Confirmação permite liberar valor diferente do solicitado — a sobra vira automaticamente novo lançamento pendente. Campo de colaborador com busca/autocomplete. `gestor_obra` não vê nada já confirmado (reforçado por RLS). Rateio entre obras restrito a `adm_geral`/`compras`.                                                                                                                                         |
| **Contratos de MO**                           | `/pagamento-mo/contratos`, `/pagamento-mo/contratos/novo`                                             | **Completo para criação/listagem.** Saldo via view `v_contrato_mo_saldo` com trigger garantindo consistência. **Ainda sem edição/cancelamento** (lacuna já conhecida, não mudou).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Ferramentas (empréstimo interno)**          | `/estoque/ferramentas`                                                                                | **Completo.** Cadastro + empréstimo/devolução com máquina de estados garantida por trigger. `listMovimentacoesFerramenta` (histórico de movimentação) **continua sem nenhuma tela que a consuma** — código órfão, lacuna não resolvida.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Ferramentas (locação externa) — novo**      | `/servicos/ferramentas`                                                                               | **Completo, módulo novo (ago-set/2026).** Gestor solicita (`ferramenta_solicitacoes`: descrição, data de necessidade, período de uso opcional); compras decide entre atender do depósito ou locar de um fornecedor. Locação exige WhatsApp enviado ao fornecedor antes de poder confirmar entrega; devolução é soft-delete (mantém histórico); relatório em PDF agrupado por fornecedor; popup de lembrete para locações vencidas/sem mensagem enviada no login.                                                                                                                                                                                                     |
| **Serviços de obra (Caçamba/Desmobilização)** | `/servicos/cacamba`(+`/[id]`), `/servicos/desmobilizacao`                                             | **Completo.** Caçamba: `pendente` (aguardando compras enviar WhatsApp ao fornecedor) → `solicitada` → `ativa` → `encerrada` (arquivada por padrão, acessível via filtro). Vínculo com fornecedor e valor (centro de custo Insumos no orçamento). Detalhe clicável com histórico completo de eventos. Popup de lembrete de vencidas. Desmobilização: `pendente → concluída`, inalterada.                                                                                                                                                                                                                                                                              |
| **Despesas manuais — novo**                   | _(dentro do hub da obra, `/obras/[id]`)_                                                              | **Completo, módulo novo (ago/2026).** Lançamento financeiro livre contra qualquer item de orçamento da obra, fora do fluxo estruturado de Compras/serviços. Restrito a `adm_geral`/`compras` (nem `gestor_obra` lança).                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Links curtos — infra, não é tela**          | `/l/[code]`                                                                                           | **Completo, infraestrutura interna.** Encurta signed URLs do Storage (200+ caracteres) para mensagens de WhatsApp — usado no PDF de pedido/cotação e na aprovação pública. Sem tela própria de gestão (não precisa — é gerado e consumido internamente).                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Rate limiting — infra, não é tela**         | _(nenhuma)_                                                                                           | **Completo, infraestrutura de segurança.** Login, aprovação pública, extração por IA, log de WhatsApp e resolução de link curto passam por `check_rate_limit` (Postgres). Falha aberta em caso de erro na checagem.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Estoque**                                   | `/estoque`, `/estoque/requisicoes`(+`/[id]`), `/estoque/relatorio`                                    | **Completo.** Entrada/saída manual (com preço unitário opcional), requisições de almoxarifado com tratamento de falta, relatório em tela + PDF com filtro de período/obra.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Dashboard**                                 | `/dashboard`                                                                                          | **Completo.** Cards clicáveis como filtros. Conteúdo role-aware (`almox` vê visão só de estoque; demais papéis veem contadores por grupo de status de compras + outras solicitações pendentes + log de atividade paginado).                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Usuários/Permissões**                       | `/usuarios`, `/usuarios/novo`, `/usuarios/[id]`                                                       | **Completo.** Criar/editar/excluir usuário, grade de permissões, vínculo de gestor a obras. Restrito a `adm_geral`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Clientes**                                  | `/clientes`                                                                                           | **Stub / não implementado** — reservado para futura administração multi-tenant do SaaS. Não mudou.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Fornecedores**                              | `/fornecedores`                                                                                       | **Completo.** CRUD próprio em `features/fornecedores/`, usado em cotação, caçamba e locação de ferramenta.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **PWA**                                       | _(aplicação inteira)_                                                                                 | **Completo.** Instalável, manifest + service worker próprio (sem cache de dados), ícones e splash dedicados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Realtime**                                  | _(aplicação inteira, dashboard)_                                                                      | **Completo.** Um canal global assina ~27 tabelas de negócio via `postgres_changes`, disparando `router.refresh()` com debounce.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Histórico/Auditoria**                       | _(consumido dentro do dashboard e detalhes)_                                                          | **Completo.** Tabela `historico` append-only, alimentada por praticamente toda ação de mutação. Datas/horários exibidos usam fuso de São Paulo explicitamente (corrigido em 2026-08).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 3.2 Endpoints (Route Handlers)

| Método | Rota                                 | Propósito                                                                                                            |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                        | Healthcheck trivial                                                                                                  |
| POST   | `/api/whatsapp/log`                  | Registra clique de link do WhatsApp no histórico (requer auth, com rate limit)                                       |
| GET    | `/api/obras/[id]/relatorio`          | PDF de orçado x realizado da obra (permissão `obras.orcamento.view`)                                                 |
| GET    | `/api/estoque/relatorio`             | PDF de relatório de estoque, com filtros (permissão `estoque.view`)                                                  |
| GET    | `/api/ferramentas/locadas/relatorio` | PDF de ferramentas locadas, agrupado por fornecedor                                                                  |
| GET    | `/api/cron/cleanup-pdfs`             | Chamado pelo Vercel Cron (03:00 UTC diário); apaga do Storage PDFs/links com >90 dias, autenticado por `CRON_SECRET` |
| GET    | `/l/[code]`                          | Resolve link curto público (`short_links`) e redireciona para a URL real (com rate limit)                            |

### 3.3 Server Actions por domínio (principais, atualizado)

- `features/auth/actions.ts` — `login` (com rate limit), `logout`
- `features/compras/actions/purchase-actions.ts` — `createSolicitacao`, `editarSolicitacao` (gestor, enquanto não avançou), `decidirEstoqueSolicitacao`, `iniciarCotacao`, `salvarCotacao`, `uploadCotacao`, `validarCotacao`, `programarPedido`, `enviarParaAprovacao`, `registrarDecisaoPublica` (cliente admin, aprovação dividida por fornecedor + prazo de pagamento, com rate limit), `confirmarRecebimentoPedido`, `avancarFluxo`
- `features/compras/actions/item-actions.ts` — `createUnit`, `createItem`, `searchItemsAction`
- `features/obras/actions/obra-actions.ts` — `createObra`, `updateObra` (não usada), `updateObraFase`, `updateObraGestor`, `createOrcamentoItem`, `deleteOrcamentoItem`, `createDespesaManual`
- `features/materiais/actions/materiais-actions.ts` — `createUnidade`, `toggleUnidadeAtivo`, `createItemCatalogo`, `updateItemCatalogo`, `deleteItemCatalogo`, `bulkUpdateItensCatalogo`, `bulkDeleteItensCatalogo`
- `features/materiais/actions/import-actions.ts` — `importItemsCsv`
- `features/pagamento-mo/actions/mo-actions.ts` — `createLancamento`, `createLancamentoRateio`, `createContrato`, `confirmarLancamento` (aceita valor diferente do solicitado), `darBaixaVale`, `createColaboradorGestor`, `createColaborador`
- `features/ferramentas/actions.ts` — `createFerramenta`, `registrarSaidaFerramenta`, `registrarEntradaFerramenta`, `solicitarFerramenta`, `decidirFerramentaDeposito`, `decidirFerramentaLocacao`, `marcarMensagemFerramentaEnviada`, `marcarMensagemLocacaoSolicitacaoEnviada`, `confirmarEntregaFerramentaLocada`, `confirmarDevolucaoFerramentaLocada`, `editarLocacaoFerramenta`
- `features/servicos-obra/actions.ts` — `createCacamba`, `solicitarTrocaCacamba`, `solicitarDevolucaoCacamba`, `confirmarEntregaCacamba`, `confirmarTrocaCacamba`, `confirmarDevolucaoCacamba`, `createDesmobilizacao`, `confirmarDesmobilizacao`
- `features/estoque/actions.ts` — `registrarEntradaEstoque`, `registrarSaidaEstoque`, `confirmarSeparacao`
- `features/fornecedores/actions.ts` — CRUD de fornecedores
- `features/perfil/actions.ts` — edição de perfil (nome/telefone/foto)
- `app/(dashboard)/usuarios/actions.ts` — `updateUserRole`, `createUser`, `updateUserPermissions`, `updateObraVinculos`, `updateUserAccount`, `deleteUser`
- `services/short-link-service.ts` — `createShortLink` / `createShortLinkWithClient` (não é Server Action exposta a formulário, é usada internamente por outras actions ao montar mensagens de WhatsApp)

---

## 4. Banco de dados / Modelos de dados

Banco Postgres via Supabase, sem ORM. Schema definido inteiramente em SQL em
`supabase/migrations/` (**68 arquivos**, de `202606290001` a `202609140001` — a mais
recente otimiza performance de RLS, ver Seção 0, 2026-09-14). Project ref:
`iguixokrvatlyajnldqv`.

### 4.1 Tabelas (34 no total — 4 novas desde jul/2026)

Tabelas já documentadas antes continuam com a mesma estrutura de base, com colunas novas
listadas onde relevante (ver 4.1.1). Tabelas **novas**:

| Tabela                    | Colunas-chave                                                                                                                                                                      | Relacionamentos (FK)                                                                                       | Observações                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `short_links`             | id, code (unique), target_url, cliente_id, created_by                                                                                                                              | cliente_id→clientes; created_by→profiles                                                                   | Multi-tenant com RLS; resolução pública em `/l/[code]` usa cliente admin (contorna RLS de propósito)                       |
| `despesas_manuais`        | id, cliente_id, obra_id, orcamento_item_id, descricao, valor, data_despesa, criado_por                                                                                             | obra_id→obras; orcamento_item_id→obra_orcamento_itens; criado_por→profiles                                 | Multi-tenant com RLS; só `adm_geral`/`compras` escrevem; pode vincular a item de qualquer tipo de orçamento                |
| `rate_limit_hits`         | id (identity), rl_key, created_at                                                                                                                                                  | nenhuma (chave lógica arbitrária)                                                                          | Sem `cliente_id` (infra técnica); RLS habilitada sem policies — acesso só via função `check_rate_limit` (security definer) |
| `ferramenta_solicitacoes` | id, cliente_id, obra_id, descricao, observacao, status, decisao, ferramenta_id, data_necessidade, periodo_uso, fornecedor_id, mensagem_enviada_em, solicitado_por, atendido_por/at | obra_id→obras; ferramenta_id→ferramentas; fornecedor_id→fornecedores; solicitado_por/atendido_por→profiles | Multi-tenant com RLS restrita por `obra_usuarios` para `gestor_obra` (desde 2026-09-10)                                    |

Total de tabelas de negócio hoje: as 30 já documentadas em jul/2026 + estas 4 = 34.

### 4.1.1 Colunas novas em tabelas existentes (desde jul/2026)

| Tabela                  | Colunas novas                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pedidos`               | `local_entrega` (enum `pedido_local_entrega`), `retirada_autorizado_nome`, `retirada_autorizado_documento`, `retirada_destino_final`, `recebido_em`, `recebido_por` |
| `movimentacoes_estoque` | `preco_unitario`                                                                                                                                                    |
| `colaboradores`         | `observacao`, `valor_diaria`                                                                                                                                        |
| `solicitacoes`          | `cotacao_request_pdf_url`, `cotacao_request_pdf_gerado_em`, `cotacao_request_pdf_path`                                                                              |
| `solicitacao_itens`     | `fornecedor_aprovado_id` (aprovação dividida por fornecedor, no nível do item)                                                                                      |
| `obras`                 | `contratante_nome`, `contratante_documento`, `contratante_email`, `telefone_responsavel`                                                                            |
| `cacambas`              | `orcamento_item_id`, `valor`, `fornecedor_id`, `mensagem_enviada_em`, `data_prevista` (default `'pendente'` no status)                                              |
| `ferramentas`           | `fornecedor_id`, `valor_locacao`, `data_prevista_devolucao`, `mensagem_enviada_em`, `entregue_em`                                                                   |
| `cotacoes`              | `desconto_percentual`                                                                                                                                               |
| `aprovacoes`            | `prazo_pagamento` (migration `202609110001`, aplicada e commitada em 2026-09-11)                                                                                    |

### 4.2 Views

- `v_obra_orcamento_realizado` — orçado x realizado por item de orçamento; ganhou colunas
  `servicos_realizado` (órfã, ver seção 7) e `despesas_realizado`; o join de cotação passou
  a ser por `solicitacao_itens.fornecedor_aprovado_id` (nível item) em vez de
  `solicitacoes.fornecedor_aprovado_id` (nível solicitação), suportando aprovação dividida.
- `v_colaborador_saldo` — saldo corrente por colaborador (confirmado/pendente).
- `v_estoque_saldo` — quantidade em estoque calculada dinamicamente a partir de
  `movimentacoes_estoque` (nunca armazenada diretamente).
- `v_contrato_mo_saldo` — saldo de contrato de MO (valor_confirmado/pendente/restante).

Todas com `security_invoker = true`.

### 4.3 Enums (atualizado)

Enums já existentes com **valores novos**:

- `obra_orcamento_tipo` — ganhou `'servicos'` (adicionado e depois esvaziado de uso real,
  ver seção 7) e `'extra'` (em uso, para custos como seguro/ART/impostos).
- `cacamba_status` — ganhou `'pendente'` (novo estágio inicial, antes de `'solicitada'`).
- `ferramenta_status` — ganhou `'locada'` (ferramenta de fornecedor externo, nasce já
  vinculada à obra sem passar por `'deposito'`).

Enums **novos**:

- `pedido_local_entrega` (`'obra'`, `'deposito'`, `'retirada'`).
- `ferramenta_solicitacao_status` (`'pendente'`, `'atendida'`, `'cancelada'`).
- `ferramenta_solicitacao_decisao` (`'deposito'`, `'locacao'`).
- `ferramenta_periodo_uso` (`'diaria'`, `'semanal'`, `'mensal'`).

Enums sem mudança: `user_role`, `solicitacao_status` (14 valores, `autorizada` continua
morto), `cotacao_status`, `aprovacao_status`, `pedido_status`, `prioridade_solicitacao`,
`obra_fase`, `lancamento_mo_tipo`, `lancamento_mo_status`, `movimentacao_estoque_tipo`,
`requisicao_almox_status`, `contrato_mo_status`, `movimentacao_ferramenta_tipo`,
`cacamba_acao_pendente`, `cacamba_evento_tipo`, `solicitacao_servico_status`.

### 4.4 Storage (buckets)

- `pedidos-pdf` — privado, só PDF, limite 10MB.
- `anexos` — privado, limite 50MB (guarda também os PDFs "pedido de cotação", referenciados
  por `solicitacoes.cotacao_request_pdf_path`).
- `avatars` — leitura pública, limite 5MB, PNG/JPEG/WEBP.

Limpeza automática diária via Vercel Cron (`/api/cron/cleanup-pdfs`, 90 dias) — ver 3.2/8.4.

### 4.5 Funções helper de RLS / segurança (security definer)

`current_profile_cliente_id()`, `current_profile_role()`, `is_admin()`,
`same_cliente(uuid)`, `can_access_solicitacao(uuid)`, `check_rate_limit(text, int, int)`
(nova, ver seção 2.2/6).

### 4.6 Padrão de RLS

Toda tabela de negócio tem RLS habilitada, seguindo o padrão:
`same_cliente(cliente_id)` (isolamento multi-tenant) + `current_profile_role() in (...)`
(restrição por papel) + `is_admin()` como escape hatch para `adm_geral` **desde que também
amarrado ao próprio tenant** (ver bug #6 na seção 7.1 — o escape hatch já foi implementado
sem essa amarração, e isso já foi corrigido uma vez).

Desde 2026-09-10, o padrão de SELECT com escopo de obra ficou uniforme: `same_cliente(...)
and (current_profile_role() <> 'gestor_obra' or exists (select 1 from obra_usuarios where
obra_id = ... and user_id = auth.uid() and ativo = true))`, aplicado a
`lancamentos_mo`, `contratos_mo`, `cacambas`, `cacamba_eventos`,
`solicitacoes_desmobilizacao` e `ferramenta_solicitacoes` (além de `solicitacoes`, que já
tinha esse padrão desde 2026-07 via `can_access_solicitacao()`).

Casos especiais (sem mudança): tabelas de movimentação (`historico`,
`movimentacoes_estoque`, `movimentacoes_ferramentas`, `cacamba_eventos`) são insert-only;
`contratos_mo` e `ferramentas` não têm policy de UPDATE direta — mudança de status só via
trigger `SECURITY DEFINER`. `rate_limit_hits` tem RLS habilitada **sem nenhuma policy** —
todo acesso passa pela função `check_rate_limit`.

### 4.7 Realtime

`supabase_realtime` publication inclui hoje ~27 tabelas de negócio: `solicitacoes`,
`solicitacao_itens`, `solicitacao_anexos`, `cotacoes`, `aprovacoes`, `pedidos`,
`historico`, `requisicoes_almox`, `requisicao_almox_itens`, `movimentacoes_estoque`,
`estoque_itens`, `lancamentos_mo`, `contratos_mo`, `colaboradores`, `cacambas`,
`cacamba_eventos`, `solicitacoes_desmobilizacao`, `obras`, `obra_usuarios`,
`obra_orcamento_itens`, `despesas_manuais`, `ferramentas`, `movimentacoes_ferramentas`,
`ferramenta_solicitacoes`, `fornecedores`, `items`, `unidades`, `profiles`. RLS de cada
tabela continua sendo a fronteira real — Realtime só entrega o que o usuário já poderia
ler via SELECT.

### 4.8 Seed / dados iniciais

Sem mudanças: `supabase/seed/initial_client.sql`, `supabase/seed/bootstrap-admin.sql.example`,
`supabase/scripts/reset-dados-teste.sql` + `reset-auth-users.mjs`.

---

## 5. Dependências e integrações

### 5.1 Bibliotecas principais e para que servem (atualizado)

Sem mudança de propósito desde jul/2026 para a maioria — destaques do que mudou:

| Pacote                  | Uso                                                                              | Nota                                   |
| ----------------------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| `@supabase/supabase-js` | Cliente de banco/auth/storage                                                    | Atualizado para ^2.110.7 (era ^2.55.0) |
| `@supabase/ssr`         | Suporte a SSR via cookies                                                        | Atualizado para ^0.12.3 (era ^0.6.1)   |
| `cmdk`                  | Command palette/busca (usado em comboboxes de item/colaborador com autocomplete) | Confirmado em uso                      |
| `tailwind-merge`        | Merge de classes Tailwind (junto com `clsx`/`cva`)                               | Confirmado em uso                      |
| `vitest`                | Testes de integração (RLS/triggers, tenant descartável via service-role)         | `npm run test` — script novo           |
| `playwright`            | Testes E2E/manuais (login real documentado na Seção 0)                           | Já era devDependency                   |

Todas as demais libs da tabela da seção 1 seguem com o mesmo propósito documentado
anteriormente (Next.js, React, Zod, react-hook-form, TanStack Table, Radix/shadcn,
lucide-react, next-themes, react-day-picker, date-fns, pdf-lib, papaparse,
`@anthropic-ai/sdk`).

**Não há** dependência de PWA (`next-pwa`/`workbox`) — manifest e service worker são
escritos à mão (`app/manifest.ts`, `public/sw.js`).

### 5.2 Integrações externas / serviços de terceiros

Sem mudança: **Supabase** (banco, Auth, Storage, MCP), **Anthropic API**
(`services/ai-extraction-service.ts`, agora casando item por ID em vez de texto),
**WhatsApp** via links `wa.me` (hoje frequentemente encurtados via `short_links`) +
`/api/whatsapp/log`.

### 5.3 Variáveis de ambiente necessárias (sem mudança)

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET` (autentica a chamada do
Vercel Cron em `/api/cron/cleanup-pdfs` — confirmado em uso real, não mais "opcional
recomendado", já que o cron está configurado e rodando).

**Deploy/CI**: Vercel (`https://una.v2digital.com.br`). `vercel.json` confirmado no
repositório com um único cron (`/api/cron/cleanup-pdfs`, `0 3 * * *` = 03:00 UTC diário).

---

## 6. O que falta fazer

### 6.1 Funcionalidades pendentes (atualizado — vários itens antigos foram resolvidos)

- **Módulo Clientes** — ainda um stub ("Módulo reservado"); segue sem CRUD real.
- **Tela de histórico de movimentação de ferramentas** — `listMovimentacoesFerramenta`
  continua existindo sem nenhuma página que a consuma (confirmado nesta auditoria).
- **Edição/cancelamento de Contratos de MO** — ainda só criar e listar.
- ~~Tela de Fornecedores~~ — **resolvido** (CRUD completo desde antes de jul/2026).
- ~~Edição/exclusão de itens em Materiais/Unidades~~ — **resolvido** nesta janela de
  commits (edição, exclusão e operação em massa).

### 6.2 Dívida a resolver (atualizado)

- ~~Aplicar a migration `202609110001_aprovacoes_prazo_pagamento.sql` no banco real~~ —
  **resolvido** em 2026-09-11 (aplicada e commitada).
- ~~Dividir o working tree em commits separados~~ — **resolvido** em 2026-09-11/14.
- ~~Otimizar policies de RLS com re-avaliação de `auth.uid()` por linha e policies
  permissivas duplicadas~~ — **resolvido** em 2026-09-14 (migration
  `202609140001_optimize_rls_performance.sql`, ver Seção 0).
- **Atualizar `docs/SISTEMA.md`** — segue desatualizado (não foi reauditado nesta sessão,
  que focou neste PROJECT_STATUS.md); não reflete nenhum dos módulos criados desde jul/2026
  (locação de ferramentas, caçamba com fornecedor, despesas manuais, links curtos, rate
  limiting, Realtime, PWA).
- **Enum `obra_orcamento_tipo` com valor morto `'servicos'`** — mantido só por não valer a
  pena recriar o tipo pra removê-lo (mesma lógica já aplicada a `autorizada` em
  `solicitacao_status`); a coluna `servicos_realizado` da view também é órfã.
- ~~Regenerar `types/database.ts`~~ — **resolvido**, cobre o schema completo hoje.
- ~~Cobrir mais rotas no matcher de `middleware.ts`~~ — **resolvido**, praticamente todas
  as rotas autenticadas estão protegidas hoje.

### 6.3 Próximos passos lógicos sugeridos (revisado)

1. ~~Commitar o trabalho pendente do working tree e aplicar a migration `202609110001`~~
   — feito.
2. Atualizar `docs/SISTEMA.md` para refletir a arquitetura atual (é a maior lacuna de
   documentação hoje, dado o volume de módulos novos desde a última vez que foi tocado).
3. Adicionar tela de histórico de ferramentas (aproveitando `listMovimentacoesFerramenta`,
   já pronto do lado do serviço).
4. Avaliar edição/cancelamento de Contratos de MO, se a operação real do dia a dia
   precisar disso.
5. Considerar ampliar a cobertura de testes automatizados (`vitest`) para além dos pontos
   que já tiveram bugs de RLS — hoje a suíte é focada em regressão desses casos
   específicos, não é uma cobertura geral do sistema.

---

## 7. Problemas conhecidos / dívida técnica

- **Testes automatizados existem mas são focados, não abrangentes** — `vitest` cobre
  principalmente pontos com histórico de bugs de RLS/triggers (tenant descartável via
  service-role); `playwright` está instalado para uso manual/E2E, mas não há suíte E2E
  automatizada rodando em CI. Não há workflow de CI (`.github/workflows`) configurado.
- **`types/database.ts` mantido manualmente** — não é gerado automaticamente a cada
  mudança de schema (não há `database.types.ts` gerado nem hook que rode
  `mcp__supabase__generate_typescript_types` automaticamente); está completo e correto
  hoje (2662 linhas, 32 tabelas + views + RPCs), mas depende de alguém lembrar de
  atualizá-lo manualmente a cada migration nova — risco latente de ficar defasado de novo.
- **Tabela `materiais` formalmente depreciada mas ainda presente** — substituída por
  `items`/`unidades` desde a migration `202607100005`, mantida apenas para leitura
  histórica (`solicitacao_itens.material_id`). Inserts nela são bloqueados por RLS. Código
  novo não deve gravar em `materiais` nem em `material_id` — usar sempre `items`/`item_id`.
- **Duplicação intencional de regras de autorização** (RLS + Server Action) — defesa em
  profundidade deliberada, mas historicamente causou dessincronia real repetidas vezes (ver
  seção 7.1, agora com 7 casos documentados, o mais recente em 2026-09-10). Qualquer nova
  regra de escopo por obra precisa ser replicada dos dois lados — **e o SELECT precisa da
  mesma restrição do INSERT**, não só o INSERT (esse foi o padrão de erro mais recorrente).
- **Workarounds documentados em `next.config.ts`**:
  - IP de LAN hardcoded (`allowedDevOrigins`) para testes via celular em rede local —
    específico da máquina/rede atual.
  - Limite de body de Server Action elevado para 6MB (upload de foto de perfil).
  - Cache do webpack desabilitado em modo dev (`config.cache = false`) por causa de
    conflitos de sincronização do OneDrive na pasta do projeto.
  - **Novo**: bloco `headers()` adiciona HSTS, X-Frame-Options DENY, X-Content-Type-Options,
    Referrer-Policy e Permissions-Policy em todas as rotas (auditoria de segurança de
    2026-08-08, motivada por risco de clickjacking em `/aprovacao/[token]`).
- **Enums com valores mortos** — `solicitacao_status.autorizada` (já documentado antes) e,
  desde ago/2026, também `obra_orcamento_tipo.servicos` (ver seção 6.2). Pegadinha para
  quem for iterar sobre os valores desses enums esperando que todos estejam em uso.
- **`docs/SISTEMA.md` continua desatualizado** — não foi reauditado nesta sessão (ver
  seção 6.2/6.3).
- **Rate limiting falha aberto** — se a RPC `check_rate_limit` falhar (rede, RPC fora do
  ar), a requisição é liberada em vez de bloqueada. É uma escolha deliberada (não pode
  virar ponto único de falha em login/aprovação pública), mas significa que o rate
  limiting não é uma garantia de segurança absoluta, só uma camada de fricção.

### 7.1 Bugs históricos já corrigidos (contexto útil, não são pendências)

Documentados nos próprios comentários das migrations — relevantes porque mostram padrões
de erro que podem se repetir em código novo:

1. **IDOR em RLS de `solicitacoes`** (`202607120001`) — a policy original só checava
   `same_cliente`, permitindo que qualquer `gestor_obra` visse e editasse solicitações de
   qualquer outro gestor da mesma empresa. Corrigido com `responsavel_obra_id` +
   `can_access_solicitacao()`.
2. **Bug de tautologia em subquery `EXISTS`** (`202607120006`) — coluna não qualificada
   dentro de um `EXISTS` resolvia para a própria tabela do subquery, virando tautologia
   sempre verdadeira; qualquer `gestor_obra` vinculado a qualquer obra podia criar
   solicitação para qualquer outra obra.
3. **RLS ausente em `user_permissions` e `obra_usuarios`** (`202607090001`) — permitia
   leitura/escrita cross-tenant.
4. **Policy de SELECT faltando no bucket `avatars`** (`202607180006`) — upload com
   `upsert: true` falhava por não conseguir resolver o conflito sem permissão de leitura.
5. **Cast de enum faltando em trigger** (`202607180005`) — `CASE` sem cast explícito
   resolvido como `text` pelo Postgres, rejeitado ao atribuir a coluna enum. Lição
   reaproveitada no trigger de `cacamba_eventos` (`202607180007`).
6. **IDOR/escape hatch sem tenant scope em `clientes`** (`202608080001`, achado em auditoria
   de segurança de 2026-08-08) — `clientes_select_same_tenant` e `clientes_admin_write`
   usavam `is_admin()` como condição isolada, sem amarrar ao próprio `cliente_id` do ator.
   Qualquer `adm_geral` conseguia **ler dados de outras empresas do SaaS** (razão social,
   CNPJ, endereço) e, mais grave, **dar UPDATE/DELETE na linha de outro tenant** — como
   várias FKs cascateiam a partir de `clientes`, isso apagaria a empresa inteira de outro
   tenant. Corrigido amarrando `is_admin() and id = current_profile_cliente_id()`.
7. **SELECT sem restrição de `obra_usuarios` para `gestor_obra`** (`202609100002`, achado
   em 2026-09-10) — em `lancamentos_mo`, `contratos_mo`, `cacambas`, `cacamba_eventos`,
   `solicitacoes_desmobilizacao` e `ferramenta_solicitacoes`, apenas o INSERT restringia
   `gestor_obra` às obras vinculadas; o SELECT checava só `same_cliente`. Como todo acesso
   ao banco usa o cliente autenticado da sessão (não service role), **qualquer gestor de
   obra conseguia ler via API direta esses dados de qualquer obra da empresa**, não só das
   suas. Corrigido uniformizando o padrão de SELECT com a checagem de `obra_usuarios` em
   todas essas tabelas (mesmo padrão do bug #1/#2, seis anos^H^H^H meses depois).

---

## 8. Como rodar o projeto

### 8.1 Instalação

```bash
npm install
```

### 8.2 Configuração do Supabase

Sem mudanças no roteiro desde jul/2026: criar projeto, copiar credenciais, criar buckets
(`anexos`, `pedidos-pdf`, `avatars`), preencher `.env.local`, rodar **todas** as 67
migrations de `supabase/migrations/` em ordem cronológica pelo nome do arquivo no SQL
Editor do Supabase (o `README.md` pode listar um subconjunto mais antigo — rodar a pasta
inteira), rodar a seed inicial e criar o primeiro `adm_geral` via
`supabase/seed/bootstrap-admin.sql.example`.

### 8.3 Rodando localmente

```bash
npm run dev          # servidor de desenvolvimento
npm run build         # build de produção
npm run start          # servidor de produção (após build)
npm run lint            # ESLint
npm run format           # Prettier --write
npm run format:check      # Prettier --check
npm run typecheck          # tsc --noEmit
npm run test               # vitest run — testes de integração (precisa de service-role key)
```

Nota sobre PWA: o service worker (`public/sw.js`) só é registrado em produção
(`components/pwa-register.tsx`) — para testar a instalação como app, usar `npm run build`

- `npm run start` (ou o deploy real), não `npm run dev`.

### 8.4 Deploy

Vercel (`https://una.v2digital.com.br`). `vercel.json` configura um cron job diário
(`/api/cron/cleanup-pdfs`, 03:00 UTC) que apaga do Storage os PDFs de cotação/pedido e
invalida links curtos com mais de 90 dias, autenticado via `CRON_SECRET`. Não há workflow
de GitHub Actions nem `Dockerfile` — deploy segue sendo via integração direta da Vercel
com o repositório.
