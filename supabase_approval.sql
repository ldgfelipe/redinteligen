-- =============================================
-- OMNIFY - QUITAR VALIDACION EMAIL + APROBACION ADMIN
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Tabla de aprobacion (si no existe)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  approved boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamp with time zone default now() not null
);
alter table public.user_profiles enable row level security;
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles for select using (auth.uid() = id or exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.is_admin = true));
drop policy if exists "Admin can update approvals" on public.user_profiles;
create policy "Admin can update approvals" on public.user_profiles for update using (exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.is_admin = true));
drop policy if exists "Service can insert profiles" on public.user_profiles;
create policy "Service can insert profiles" on public.user_profiles for insert with check (true);

-- 2. Auto-confirmar email y crear profile + workspace al registrarse
create or replace function public.handle_new_user_approval()
returns trigger as $$
begin
  -- Auto-confirmar email (quita validacion)
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  new.confirmed_at := coalesce(new.confirmed_at, now());

  -- Insertar profile
  insert into public.user_profiles (id, email, approved, is_admin)
  values (
    new.id,
    new.email,
    case when new.email = 'ldgfelipecarrera@gmail.com' then true else false end,
    case when new.email = 'ldgfelipecarrera@gmail.com' then true else false end
  )
  on conflict (id) do update set email = excluded.email, is_admin = excluded.is_admin;

  -- Crear workspace si no existe
  insert into public.workspaces (user_id, name)
  values (new.id, 'Mi Workspace')
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger en auth.users (antes de insert para auto-confirmar)
drop trigger if exists on_auth_user_created_approval on auth.users;
create trigger on_auth_user_created_approval
  before insert on auth.users
  for each row execute function public.handle_new_user_approval();

-- 3. Backfill para usuarios existentes
insert into public.user_profiles (id, email, approved, is_admin)
select id, email, true, (email = 'ldgfelipecarrera@gmail.com')
from auth.users
on conflict (id) do update set approved = true, is_admin = (excluded.email = 'ldgfelipecarrera@gmail.com');

-- Verificar
select email, approved, is_admin from public.user_profiles;
