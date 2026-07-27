# Depreciações

Registro do que está formalmente depreciado no schema, pra evitar uso incorreto por quem for mexer no código depois.

## Tabela `materiais` e coluna `solicitacao_itens.material_id`

**Depreciados desde a migração `supabase/migrations/202607100005_materiais_to_items_migration.sql`**, substituídos por `items`/`unidades` e `solicitacao_itens.item_id`.

- A tabela `materiais` continua existindo só para leitura histórica de registros antigos de `solicitacao_itens.material_id` — não é usada por nenhum código de aplicação atual.
- Inserts em `materiais` estão bloqueados por RLS desde `202607100006_materiais_deprecate_rls.sql` (a policy de escrita foi removida; só update/delete continuam liberados pra quem precisar corrigir dado antigo pontualmente).
- `solicitacao_itens` mantém as duas colunas (`material_id` legado + `item_id` atual) por compatibilidade com linhas antigas. **Código novo nunca deve gravar em `materiais` nem em `material_id`** — usar sempre `items`/`unidades`/`item_id`.

Se algum dia o histórico antigo deixar de ser necessário, dá pra dropar `materiais` e a coluna `material_id` de vez — até lá, ambos ficam só como referência morta.
