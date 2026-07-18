insert into public.clientes (id, razao_social, nome_fantasia, cnpj)
values (
  '00000000-0000-0000-0000-000000000001',
  'UNA Construtora',
  'UNA',
  null
)
on conflict (id) do nothing;
