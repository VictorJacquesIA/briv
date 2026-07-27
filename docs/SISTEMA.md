# UNA Compras — Descritivo do Sistema

> Atualizado em 2026-07-21 a partir do estado real do código e do banco de dados (projeto Supabase `iguixokrvatlyajnldqv`). Reflete o que está **construído e funcionando**, não o roadmap. Substitui a versão de 2026-07-09, que ficou desatualizada assim que os módulos de estoque/almoxarifado, ferramentas, contratos de mão de obra, serviços de obra e o papel `almox` foram adicionados (10–18/07), seguidos do CRUD de Fornecedores (21/07).

## 1. O que é

Painel interno de compras, obras e materiais para a **UNA Reforma e Construção**, cobrindo o fluxo completo desde a solicitação de material por uma obra até a emissão do pedido de compra ao fornecedor (com aprovação via link público, sem exigir login do gestor), além de controle de estoque/almoxarifado, ferramentas, pagamento de mão de obra e serviços de obra (caçamba de entulho, desmobilização).

Arquitetura multi-tenant desde o início (`cliente_id` em quase todas as tabelas), mas hoje roda para um único tenant: **UNA REFORMA E CONSTRUÇÃO**.

## 2. Papéis e permissões

Quatro papéis fixos (`public.user_role` enum): `adm_geral`, `compras`, `gestor_obra`, `almox`.

| Papel         | Acesso                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adm_geral`   | Acesso total, ignora a tabela de permissões (`hasPermission` retorna `true` sempre). Único que gerencia usuários (`usuarios.manage`) e vê configurações.                                                |
| `compras`     | Fluxo de compras completo (solicitações, cotações, WhatsApp, PDF, fornecedores, materiais, estoque, pagamento de mão de obra) por padrão; **não** gerencia usuários nem configurações.                  |
| `gestor_obra` | Escopado às obras vinculadas via `obra_usuarios`. Cria/edita solicitações e lançamentos de mão de obra da própria obra; **não** vê cotações, fornecedores nem preços; sem acesso a estoque/ferramentas. |
| `almox`       | Almoxarife. Foco exclusivo em estoque: itens em depósito, entradas/saídas, requisições, ferramentas. Sem acesso a compras, obras, materiais, pagamento de MO ou usuários.                               |

Permissões são granulares (`lib/permissions-shared.ts`, tabela `user_permissions`, 47 chaves) — cada usuário pode ter uma permissão específica ligada/desligada além do default do papel. `adm_geral` sempre tem tudo.

Gestão de usuários: `/usuarios` (listar), `/usuarios/novo` (criar via Supabase Admin API + seed de permissões default do papel), `/usuarios/[id]` (editar conta, permissões e vínculos com obras; excluir usuário — bloqueado para auto-exclusão e para o último `adm_geral` da empresa). Só `adm_geral` acessa.

## 3. Fluxo de compras (máquina de estados de `solicitacoes.status`)

```
aberta ──► em_cotacao ──► aguardando_aprovacao ──┬─► pdf_gerado ──► pedido_enviado ──► finalizada
                                                    └─► rejeitada
                          (a qualquer momento) ──► cancelada
```

1. **`aberta`** — `gestor_obra` ou `compras` cria a solicitação (`/compras/nova`): obra, prioridade, data de necessidade, itens (catálogo `items`/`unidades` + quantidade) e anexos (upload para bucket `anexos`). Antes de seguir pra cotação, `compras`/`adm_geral` decide por item se sai do estoque interno ou vai a cotação (`decidirEstoqueSolicitacao`) — o que sai do estoque gera automaticamente uma requisição ao almoxarifado. Para `gestor_obra`, a obra precisa estar em `obra_usuarios` (validado no server action e reforçado por RLS) e ele vira automaticamente o `responsavel_obra_id`.
2. **`em_cotacao`** — `compras` registra orçamentos de fornecedores (`cotacao-form.tsx`), item a item, com frete/prazo/forma de pagamento — inclusive upload de arquivo com extração assistida por IA (Anthropic). Cada orçamento vira uma linha em `cotacoes` + `cotacao_itens`. Comparativo lado a lado em `comparativo.tsx`.
3. **`aguardando_aprovacao`** — ao enviar para aprovação, o sistema exige **ao menos 1 orçamento** registrado e validado. Gera um token aleatório de 32 bytes (`aprovacao_token`, expira em 14 dias) e um link público `/aprovacao/[token]`.
4. **Aprovação pública** (`/aprovacao/[token]`, sem login) — o gestor abre o link, vê o comparativo, escolhe o fornecedor (ou rejeita) e informa nome/e-mail. Usa `createAdminClient` (service role) porque quem decide não está autenticado no Supabase Auth.
   - Autorizar → gera o PDF do pedido de compra (`services/pdf-service.ts`), sobe pro bucket `pedidos-pdf`, grava `pedidos` e muda status pra `pdf_gerado`.
   - Recusar → status `rejeitada`, fim de linha.
5. **`pdf_gerado` → `pedido_enviado` → `finalizada`** — avançados manualmente pelo time de compras (`avancarFluxo`). Também existe `cancelada` a qualquer momento.

Toda transição de status grava uma linha em `historico` (ator, IP, user-agent, status anterior/novo, payload) — auditoria completa via `services/historico-service.ts`. O histórico de uma solicitação é buscado por filtro (`entidade='solicitacao', entidade_id=<id>`), não por embed do PostgREST — `historico` referencia entidades de forma polimórfica (`entidade`/`entidade_id`), sem FK real, então não há relacionamento pra embutir automaticamente num único `select`.

## 4. Estoque / Almoxarifado

- **Itens em depósito** (`/estoque`) — saldo calculado dinamicamente por `v_estoque_saldo` (nunca armazenado direto), a partir de `movimentacoes_estoque` (entrada/saída, append-only). Entrada e saída manuais disponíveis pra `compras`/`adm_geral`/`almox`.
- **Requisições ao almoxarifado** (`/estoque/requisicoes`) — geradas automaticamente quando uma solicitação de compra decide retirar item do estoque em vez de comprar. `almox` confirma a separação (`confirmarSeparacao`); se a quantidade separada for menor que a solicitada, marca divergência na solicitação de origem.
- **Relatório** (`/estoque/relatorio`) — itens, entradas e saídas num período, com filtro por obra (só filtra saídas — entradas chegam no depósito sem obra vinculada), exportável em PDF.
- **Ferramentas** (`/estoque/ferramentas`) — cadastro de ferramentas da empresa com máquina de estados garantida por trigger no banco (`check_and_sync_ferramenta_movimentacao`): não permite emprestar (`saida`) uma ferramenta já emprestada, nem devolver (`entrada`) uma que já está em depósito. A obra de origem numa devolução é sempre derivada do `obra_atual_id` da ferramenta no servidor, nunca aceita do formulário (evita adulteração).

## 5. Pagamento de mão de obra

- **Lançamentos** (`/pagamento-mo`) — solicitação, vale ou reembolso por colaborador/prestador, por obra. `gestor_obra` lança só a quantidade de diárias (não arbitra valor da diária nem centro de custo); `compras`/`adm_geral` finaliza informando o que falta na confirmação (`confirmarLancamento`).
- **Contratos** (`/pagamento-mo/contratos`) — acordo de valor fechado com um colaborador/prestador numa obra, pago em parcelas (lançamentos vinculados via `contrato_id`). Saldo (`v_contrato_mo_saldo`) e status (`aberto`/`quitado`) mantidos por trigger no banco (`check_contrato_mo_saldo` rejeita parcela que exceda o saldo restante ou lançamento em contrato já quitado; `sync_contrato_mo_status` fecha o contrato automaticamente ao bater o valor total) — não há UI de edição/cancelamento de contrato, por design.
- **Colaboradores/Prestadores** (`/pagamento-mo/colaboradores`) — cadastro simples com saldo (`v_colaborador_saldo`).

## 6. Serviços de obra

- **Caçamba de entulho** (`/servicos/cacamba`) — ciclo `solicitada → ativa → encerrada`, com troca e devolução como sub-ações pendentes (`acao_pendente`). `gestor_obra` só dispara os "pedido_*"; confirmação é de `compras`/`adm_geral`.
- **Desmobilização** (`/servicos/desmobilizacao`) — solicitação simples `pendente → concluída`.

Ambos com trigger de validação de transição de estado no banco (`check_and_sync_cacamba_evento`), mesmo padrão de defesa em profundidade dos outros módulos.

## 7. Fornecedores e Materiais

- **Fornecedores** (`/fornecedores`) — cadastro (razão social, nome fantasia, CNPJ, contato, telefone/WhatsApp, e-mail, endereço, modelo de mensagem de cotação), com ativar/desativar em vez de exclusão física. Consumido diretamente pelo fluxo de cotação de compras.
- **Materiais** (`/materiais`, `/materiais/unidades`, `/materiais/importar`) — catálogo global de itens/unidades (não por tenant), com import em massa via CSV. A tabela legada `materiais` está **depreciada** desde a migração `202607100005` — ver `docs/DEPRECATIONS.md`.

## 8. WhatsApp

**Não é integração via API** — é geração de link `wa.me/<telefone>?text=<mensagem pré-formatada>` (`services/whatsapp-service.ts`). O usuário clica, o WhatsApp Web/App abre com a mensagem pronta (pedido de cotação, aviso de aprovação pendente, ou envio do pedido ao fornecedor) e ele manda manualmente. Existe uma rota `app/api/whatsapp/log/route.ts` que registra que o clique aconteceu.

## 9. Modelo de dados (schema `public`, projeto `iguixokrvatlyajnldqv`)

30 tabelas, todas com RLS habilitada.

| Área                    | Tabelas                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Multi-tenant / usuários | `clientes`, `profiles`, `user_permissions`, `obra_usuarios`                                                        |
| Obras                   | `obras`, `obra_orcamento_itens` (+ view `v_obra_orcamento_realizado`)                                              |
| Catálogo                | `items`, `unidades`, `materiais` (depreciada)                                                                      |
| Fornecedores            | `fornecedores`                                                                                                     |
| Compras                 | `solicitacoes`, `solicitacao_itens`, `solicitacao_anexos`, `cotacoes`, `cotacao_itens`, `aprovacoes`, `pedidos`    |
| Estoque/Almoxarifado    | `estoque_itens` (+ view `v_estoque_saldo`), `movimentacoes_estoque`, `requisicoes_almox`, `requisicao_almox_itens` |
| Ferramentas             | `ferramentas`, `movimentacoes_ferramentas`                                                                         |
| Pagamento de MO         | `colaboradores`, `lancamentos_mo` (+ view `v_colaborador_saldo`), `contratos_mo` (+ view `v_contrato_mo_saldo`)    |
| Serviços de obra        | `cacambas`, `cacamba_eventos`, `solicitacoes_desmobilizacao`                                                       |
| Auditoria               | `historico` (append-only — triggers impedem update/delete)                                                         |

Buckets de Storage: `pedidos-pdf` (privado), `anexos` (privado), `avatars` (leitura pública).

## 10. Telas construídas

| Rota                                                              | O que faz                                                                                  | Quem acessa                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `/login`                                                          | Autenticação (e-mail/senha via Supabase Auth)                                              | Público                                                            |
| `/dashboard`                                                      | Contadores por status + últimas atividades (visão de `almox` é focada só em estoque)       | Todos autenticados                                                 |
| `/compras`, `/compras/nova`, `/compras/[id]`                      | Lista, criação e detalhe/andamento da solicitação                                          | `compras`, `gestor_obra` (visão restrita)                          |
| `/obras`, `/obras/nova`, `/obras/[id]`                            | Lista, criação e detalhe (fase/gestor, orçamento, relatório orçado x realizado)            | `compras`/`adm_geral`, `gestor_obra` (só vinculadas)               |
| `/materiais`, `/materiais/unidades`, `/materiais/importar`        | Catálogo de itens/unidades + import CSV                                                    | `compras`/`adm_geral`                                              |
| `/fornecedores`                                                   | Cadastro de fornecedores                                                                   | `compras`/`adm_geral`                                              |
| `/pagamento-mo`, `.../colaboradores`, `.../contratos`             | Lançamentos, colaboradores e contratos de mão de obra                                      | `compras`/`adm_geral`, `gestor_obra` (lançamentos da própria obra) |
| `/estoque`, `.../requisicoes`, `.../relatorio`, `.../ferramentas` | Estoque, requisições, relatório em PDF, ferramentas                                        | `compras`/`adm_geral`/`almox`                                      |
| `/servicos/cacamba`, `/servicos/desmobilizacao`                   | Caçamba de entulho e desmobilização                                                        | `compras`/`adm_geral`, `gestor_obra` (só solicitar)                |
| `/clientes`                                                       | **Stub** — "Módulo reservado", sem CRUD (reservado pra administração multi-tenant do SaaS) | `adm_geral`                                                        |
| `/usuarios`, `/usuarios/novo`, `/usuarios/[id]`                   | Gestão de usuários e permissões                                                            | `adm_geral`                                                        |
| `/aprovacao/[token]`, `/aprovacao/[token]/concluida`              | Decisão pública do gestor (sem login)                                                      | Público (via token)                                                |
| `/api/health`                                                     | Healthcheck                                                                                | —                                                                  |
| `/api/whatsapp/log`                                               | Log de clique em link do WhatsApp                                                          | —                                                                  |
| `/api/estoque/relatorio`, `/api/obras/[id]/relatorio`             | Geração de PDF dos relatórios                                                              | —                                                                  |

**Ainda não construído**: CRUD de Clientes (multi-tenant SaaS, hoje stub) e tela de histórico de movimentação de ferramentas (o serviço já existe, só falta a página).

## 11. Segurança — pontos relevantes já tratados

- RLS multi-tenant em toda tabela sensível, usando `current_profile_cliente_id()` / `same_cliente()`.
- `gestor_obra` só acessa obras vinculadas — validado tanto no server action quanto em policy (defesa em profundidade), no fluxo de compras, pagamento de MO, contratos, ferramentas, caçamba e desmobilização.
- Link de aprovação pública é de posse (token de 32 bytes, expira em 14 dias) — não é uma sessão autenticada.
- `historico` é append-only (triggers `prevent_historico_update`/`prevent_historico_delete`).
- Estado computado por trigger `SECURITY DEFINER` (saldo de contrato de MO, status de ferramenta, status de caçamba) — o cliente nunca escreve esses campos diretamente, só o trigger.
- `middleware.ts`/`lib/supabase/middleware.ts` protege `/dashboard`, `/clientes`, `/compras`, `/obras`, `/materiais`, `/fornecedores`, `/pagamento-mo`, `/estoque`, `/servicos` e `/usuarios` — redireciona pra `/login` sem sessão. Cada página também valida permissão no server independentemente disso (defesa em profundidade).

## 12. Estado do primeiro tenant

- Cliente seed: **UNA REFORMA E CONSTRUÇÃO** (`78a58fd5-296d-44a6-9253-6e5a88ee03d1`), criado via `supabase/seed/initial_client.sql`.
- Primeiro usuário: **Victor Jacques** (`victorjbinello@gmail.com`), papel `adm_geral`, vinculado manualmente via `supabase/seed/bootstrap-admin.sql.example`.
- Os números de usuários/obras/fornecedores/solicitações cadastrados mudam com o uso normal do sistema — para o estado atual, consultar o banco diretamente em vez desta documentação, que descreve arquitetura, não dados operacionais.
