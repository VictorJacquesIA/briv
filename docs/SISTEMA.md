# UNA Compras — Descritivo do Sistema

> Gerado em 2026-07-09 a partir do estado real do código e do banco de dados (projeto Supabase `iguixokrvatlyajnldqv`). Reflete o que está **construído e funcionando**, não o roadmap.

## 1. O que é

Painel interno de compras para a **UNA Reforma e Construção**, cobrindo o fluxo completo desde a solicitação de material por uma obra até a emissão do pedido de compra ao fornecedor, com aprovação via link público (sem exigir login do gestor).

Arquitetura multi-tenant desde o início (`cliente_id` em quase todas as tabelas), mas hoje roda para um único tenant: **UNA REFORMA E CONSTRUÇÃO**.

## 2. Papéis e permissões

Três papéis fixos (`public.user_role` enum): `adm_geral`, `compras`, `gestor_obra`.

| Papel         | Acesso                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adm_geral`   | Acesso total, ignora a tabela de permissões (`hasPermission` retorna `true` sempre). Único que gerencia usuários (`usuarios.manage`) e vê configurações. |
| `compras`     | Fluxo de compras completo (solicitações, cotações, WhatsApp, PDF, fornecedores, materiais) por padrão; **não** gerencia usuários nem configurações.      |
| `gestor_obra` | Escopado às obras vinculadas via `obra_usuarios`. Cria/edita solicitações da própria obra; **não** vê cotações, fornecedores nem preços.                 |

Permissões são granulares (`lib/permissions.ts`, tabela `user_permissions`) — cada usuário `compras`/`gestor_obra` pode ter uma permissão específica ligada/desligada além do default do papel. `adm_geral` sempre tem tudo.

Gestão de usuários: `/usuarios` (listar), `/usuarios/novo` (criar via Supabase Admin API + seed de permissões default do papel), `/usuarios/[id]` (editar permissões e vínculos com obras). Só `adm_geral` acessa.

## 3. Fluxo de compras (máquina de estados de `solicitacoes.status`)

```
aberta ──► em_cotacao ──► aguardando_aprovacao ──┬─► pdf_gerado ──► pedido_enviado ──► finalizada
                                                    └─► rejeitada
                          (a qualquer momento) ──► cancelada
```

1. **`aberta`** — `gestor_obra` ou `compras` cria a solicitação (`/compras/nova`): obra, prioridade, data de necessidade, itens (material + quantidade + unidade) e anexos (upload para bucket `anexos`). Para `gestor_obra`, a obra precisa estar em `obra_usuarios` (validado no server action e reforçado por RLS) e ele vira automaticamente o `responsavel_obra_id`.
2. **`em_cotacao`** — `compras` registra orçamentos de fornecedores (`cotacao-form.tsx`), item a item, com frete/prazo/forma de pagamento. Cada orçamento vira uma linha em `cotacoes` + `cotacao_itens`. Comparativo lado a lado em `comparativo.tsx`.
3. **`aguardando_aprovacao`** — ao enviar para aprovação, o sistema exige **ao menos 1 orçamento** registrado e validado (sem teto máximo). Gera um token aleatório de 32 bytes (`aprovacao_token`, expira em 14 dias) e um link público `/aprovacao/[token]`.
4. **Aprovação pública** (`/aprovacao/[token]`, sem login) — o gestor abre o link, vê o comparativo, escolhe o fornecedor (ou rejeita) e informa nome/e-mail. Usa `createAdminClient` (service role) porque quem decide não está autenticado no Supabase Auth.
   - Autorizar → gera o PDF do pedido de compra (`services/pdf-service.ts`), sobe pro bucket `pedidos-pdf`, cria URL assinada (30 dias), grava `pedidos` e muda status pra `pdf_gerado`.
   - Recusar → status `rejeitada`, fim de linha.
5. **`pdf_gerado` → `pedido_enviado` → `finalizada`** — avançados manualmente pelo time de compras (`avancarFluxo`). Também existe `cancelada` a qualquer momento.

Toda transição de status grava uma linha em `historico` (ator, IP, user-agent, status anterior/novo, payload) — auditoria completa via `services/historico-service.ts`.

## 4. WhatsApp

**Não é integração via API** — é geração de link `wa.me/<telefone>?text=<mensagem pré-formatada>` (`services/whatsapp-service.ts`). O usuário clica, o WhatsApp Web/App abre com a mensagem pronta (pedido de cotação, aviso de aprovação pendente, ou envio do pedido ao fornecedor) e ele manda manualmente. Existe uma rota `app/api/whatsapp/log/route.ts` que registra que o clique aconteceu.

## 5. Modelo de dados (schema `public`, projeto `iguixokrvatlyajnldqv`)

| Tabela                                                      | Papel                                                       | RLS |
| ----------------------------------------------------------- | ----------------------------------------------------------- | --- |
| `clientes`                                                  | Tenants                                                     | ✅  |
| `profiles`                                                  | Usuários (espelha `auth.users`)                             | ✅  |
| `obras`                                                     | Obras/canteiros do tenant                                   | ✅  |
| `obra_usuarios`                                             | Vínculo `gestor_obra` ↔ obra                                | ✅  |
| `fornecedores`                                              | Fornecedores                                                | ✅  |
| `materiais`                                                 | Catálogo de materiais **por tenant**                        | ✅  |
| `unidades`                                                  | Catálogo global de unidades de medida                       | ✅  |
| `items`                                                     | Catálogo global de itens (pré-cadastrado + cadastro rápido) | ✅  |
| `solicitacoes` / `solicitacao_itens` / `solicitacao_anexos` | Núcleo do fluxo                                             | ✅  |
| `cotacoes` / `cotacao_itens`                                | Orçamentos por fornecedor                                   | ✅  |
| `aprovacoes`                                                | Decisões do gestor (via link público)                       | ✅  |
| `pedidos`                                                   | Pedido de compra emitido (PDF + status)                     | ✅  |
| `historico`                                                 | Auditoria (append-only — triggers impedem update/delete)    | ✅  |
| `user_permissions`                                          | Overrides de permissão por usuário                          | ✅  |

Todas as 17 tabelas têm RLS habilitado; nenhum finding crítico nos advisors de segurança do Supabase a partir de 2026-07-09.

## 6. Telas construídas

| Rota                                                 | O que faz                                                                                                       | Quem acessa                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/login`                                             | Autenticação (e-mail/senha via Supabase Auth)                                                                   | Público                                   |
| `/dashboard`                                         | Contadores por status (abertas, em cotação, aguardando aprovação, enviados, finalizadas) + últimas atividades   | Todos autenticados                        |
| `/compras`, `/compras/nova`, `/compras/[id]`         | Lista, criação e detalhe/andamento da solicitação (cotações, comparativo, envio p/ aprovação, avanço de etapas) | `compras`, `gestor_obra` (visão restrita) |
| `/clientes`                                          | Listagem de tenants                                                                                             | `adm_geral`                               |
| `/usuarios`, `/usuarios/novo`, `/usuarios/[id]`      | Gestão de usuários e permissões                                                                                 | `adm_geral`                               |
| `/aprovacao/[token]`, `/aprovacao/[token]/concluida` | Decisão pública do gestor (sem login)                                                                           | Público (via token)                       |
| `/api/health`                                        | Healthcheck                                                                                                     | —                                         |
| `/api/whatsapp/log`                                  | Log de clique em link do WhatsApp                                                                               | —                                         |

**Ainda não construído** (existem no menu lateral como itens desabilitados, ou só como permissão/tabela sem tela própria): telas de CRUD dedicadas para **Obras**, **Materiais** e **Fornecedores** — hoje esses dados só aparecem como dropdowns dentro do fluxo de compras; cadastro é manual via SQL/Studio até essas telas existirem.

## 7. Segurança — pontos relevantes já tratados

- RLS multi-tenant em toda tabela sensível, usando `current_profile_cliente_id()` / `same_cliente()`.
- `gestor_obra` só acessa obras vinculadas — validado tanto no server action quanto em policy (defesa em profundidade).
- Link de aprovação pública é de posse (token de 32 bytes, expira em 14 dias, invalidado após uso) — não é uma sessão autenticada.
- Backdoor de login antigo (`unadev012`) removido completamente do código.
- `historico` é append-only (triggers `prevent_historico_update`/`prevent_historico_delete`).

## 8. Estado do primeiro tenant (dados reais no banco)

- Cliente: **UNA REFORMA E CONSTRUÇÃO** (`78a58fd5-296d-44a6-9253-6e5a88ee03d1`)
- Usuário: **Victor Jacques** (`victorjbinello@gmail.com`), papel `adm_geral`, ativo.
- Nenhum outro usuário (`compras`/`gestor_obra`), obra, fornecedor ou solicitação cadastrados ainda — banco funcionalmente vazio, pronto para uso.
