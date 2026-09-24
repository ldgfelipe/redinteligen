-- =============================================
-- OMNIFY - REESTRUCTURACION: CLIENTES / CAMPAÑAS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Tabla clients (carpetas por cliente)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text,
  description text,
  logo_url text,
  created_at timestamp with time zone default now() not null
);
create index if not exists idx_clients_workspace on public.clients(workspace_id);
create unique index if not exists idx_clients_slug_workspace on public.clients(workspace_id, slug) where slug is not null;

-- 2. Extender posts y social_profiles para cliente (nullable para migrar)
alter table public.posts add column if not exists client_id uuid references public.clients(id) on delete cascade;
create index if not exists idx_posts_client on public.posts(client_id);

alter table public.social_profiles add column if not exists client_id uuid references public.clients(id) on delete cascade;
create index if not exists idx_social_profiles_client on public.social_profiles(client_id);

-- 3. RLS para clients
alter table public.clients enable row level security;
drop policy if exists "Users can manage clients of own workspaces" on public.clients;
create policy "Users can manage clients of own workspaces" on public.clients for all
using (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.user_id = auth.uid()))
with check (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.user_id = auth.uid()));

-- 4. Actualizar RLS de posts y social_profiles para contemplar client_id (mantiene compatibilidad)
-- Las políticas existentes ya validan workspace, si el post tiene client_id se valida que el client pertenezca al workspace
drop policy if exists "Users can manage posts of own workspaces" on public.posts;
create policy "Users can manage posts of own workspaces" on public.posts for all
using (
  exists (select 1 from public.workspaces w where w.id = posts.workspace_id and w.user_id = auth.uid())
)
with check (
  exists (select 1 from public.workspaces w where w.id = posts.workspace_id and w.user_id = auth.uid())
);

-- Verificación
select 'clients table ready' as status;
