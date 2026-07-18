-- Novo papel "almox" (almoxarife) para o módulo de Estoque. Precisa ficar
-- isolado numa migration própria: Postgres não permite usar um valor de
-- enum recém-adicionado na mesma transação em que é adicionado (mesmo
-- padrão já usado em 202607010001_roles_permissions.sql). As policies que
-- referenciam 'almox' ficam nas migrations seguintes.

alter type public.user_role add value if not exists 'almox';
