-- FINOVA cloud backup table
-- Safe to run in Supabase SQL Editor after 0001_finova_core.sql.
create table if not exists public.finova_cloud_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.finova_cloud_backups enable row level security;
drop policy if exists "finova_backup_select_own" on public.finova_cloud_backups;
create policy "finova_backup_select_own"
  on public.finova_cloud_backups for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "finova_backup_insert_own" on public.finova_cloud_backups;
create policy "finova_backup_insert_own"
  on public.finova_cloud_backups for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "finova_backup_update_own" on public.finova_cloud_backups;
create policy "finova_backup_update_own"
  on public.finova_cloud_backups for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
