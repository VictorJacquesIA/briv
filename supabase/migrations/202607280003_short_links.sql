-- Links curtos pra substituir as signed URLs do Supabase Storage (200+
-- caracteres) quando mandadas por WhatsApp pro fornecedor — /l/{code}
-- redireciona pro target_url real (ver app/l/[code]/route.ts, resolvido
-- publicamente via service role, sem sessão).
create table public.short_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  target_url text not null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.short_links enable row level security;

create policy "short_links_tenant_all"
on public.short_links for all
using (public.same_cliente(cliente_id))
with check (public.same_cliente(cliente_id));
