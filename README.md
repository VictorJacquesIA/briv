# UNA Compras

Base profissional para o UNA Compras, um painel interno de compras para construtora preparado para evoluir para SaaS.

## Stack

- Next.js App Router, TypeScript e TailwindCSS
- shadcn/ui, React Hook Form, Zod e TanStack Table
- Supabase Auth, PostgreSQL, Storage, RLS, Server Actions e Route Handlers
- ESLint, Prettier, Husky e variaveis de ambiente

## Estrutura

- `app`: rotas, layouts, Server Components e Route Handlers
- `components`: componentes compartilhados e layout administrativo
- `features`: dominios funcionais, com auth implementado
- `services`: acesso a dados e regras de aplicacao server-side
- `lib`: clientes Supabase, ambiente e constantes
- `hooks`, `types`, `utils`: utilitarios transversais
- `supabase/migrations`: schema, RLS e buckets

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Crie um projeto no Supabase hospedado: https://app.supabase.com

3. No Dashboard do projeto, copie os valores de API:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

4. Crie os buckets de Storage:

- `anexos`
- `pedidos-pdf`

5. Configure `.env.local` usando os valores copiados e a URL do app:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

6. Execute as migrations no SQL Editor do Supabase, na ordem:

- `supabase/migrations/202606290001_foundation.sql`
- `supabase/migrations/202606290002_purchasing_flow.sql`
- `supabase/migrations/202606290003_mvp_ready.sql`
- `supabase/migrations/202607010001_roles_permissions.sql`
- `supabase/migrations/202607020001_add_unidades_items.sql`
- `supabase/migrations/202607090001_role_consolidation.sql`

7. Execute a seed inicial em SQL Editor:

- `supabase/seed/initial_client.sql`

8. Crie o primeiro usuário administrador:

- Em Authentication > Users no Supabase Studio, crie um usuário com e-mail e senha.
- Siga o roteiro em `supabase/seed/bootstrap-admin.sql.example` (substitua os placeholders) para vincular esse usuário ao papel `adm_geral`.
- Não existe mais login de desenvolvimento sem conta real — todo acesso passa pela autenticação normal do Supabase.

8. Rode o app:

```bash
npm run dev
```

> Observação: para a opção hospedada, você não precisa do Supabase CLI local. Use o Dashboard para aplicar SQL e criar buckets.

## Modulos ainda reservados

O módulo de compras foi implementado com solicitação, cotação por fornecedor e item, comparativo informativo, regra de 3 orçamentos, aprovação pública por token, histórico auditável e avanço de status até finalização/cancelamento.

## MVP operacional

- Ao autorizar uma compra, o sistema gera automaticamente o Pedido de Compra em PDF.
- O PDF é salvo no bucket `pedidos-pdf`, com caminho e URL registrados em `pedidos`.
- A tela de compras possui pesquisa, filtro, ordenação, paginação, empty state e ações com confirmação.
- O dashboard mostra solicitações abertas, em cotação, aguardando aprovação, pedidos enviados, finalizadas e últimas atividades.
- Os botões de WhatsApp montam mensagens automáticas para cotação, aprovação e pedido, usando links `wa.me`.
- Cada clique de WhatsApp registra histórico com data/hora, usuário, tipo de mensagem e destinatário.
- O histórico registra status anterior, status novo, IP e user-agent quando disponíveis.
- Migrations tornam o histórico imutável contra update/delete.

## Deploy e CI — pendente

Não há hoje nenhuma configuração de deploy ou integração contínua neste repositório: sem `vercel.json`, sem `Dockerfile`, sem workflows de GitHub Actions. O deploy, quando acontecer, precisa ser configurado manualmente numa plataforma compatível com Next.js (ex.: Vercel) — inclui decidir como as variáveis de ambiente de produção são injetadas e se as migrations do Supabase rodam automaticamente nesse processo ou continuam manuais. Isso é uma pendência de infraestrutura, não algo já resolvido.
