-- FINOVA v3 foundation
-- Apply this migration in Supabase SQL Editor.
-- Client-side users must NEVER receive the service_role key.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'FINOVA User' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'Other' check (char_length(category) <= 60),
  description text not null default '' check (char_length(description) <= 160),
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pot_name text not null check (char_length(trim(pot_name)) between 1 and 80),
  entry_type text not null check (entry_type in ('deposit','withdraw')),
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '' check (char_length(note) <= 160),
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gold_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_grams numeric(14,4) not null check (weight_grams > 0),
  purchase_price_per_gram numeric(14,2) not null check (purchase_price_per_gram > 0),
  provider_note text not null default '' check (char_length(provider_note) <= 120),
  purchase_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gold_price_quotes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  price_per_gram numeric(14,2) not null check (price_per_gram > 0),
  source text not null default 'Manual' check (char_length(source) <= 100),
  quoted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start),
  check (extract(day from month_start) = 1)
);

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Entitlements are written by trusted server-side/admin workflows only.
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('lite','pro')),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  activated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan = 'cloud_premium'),
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists savings_entries_user_date_idx on public.savings_entries(user_id, entry_date desc);
create index if not exists gold_holdings_user_date_idx on public.gold_holdings(user_id, purchase_date desc);
create index if not exists goals_user_idx on public.financial_goals(user_id);
create index if not exists licenses_user_status_idx on public.licenses(user_id, status);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id, status);

-- Maintain updated_at on mutable records.
do $$
declare t text;
begin
  foreach t in array array['profiles','transactions','savings_entries','gold_holdings','gold_price_quotes','monthly_budgets','financial_goals','licenses','subscriptions']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Create a profile automatically when a new Supabase Auth user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'FINOVA User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enable RLS on every table exposed through the public schema.
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_entries enable row level security;
alter table public.gold_holdings enable row level security;
alter table public.gold_price_quotes enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.financial_goals enable row level security;
alter table public.licenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;

-- User-owned finance records: owner-only CRUD.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['transactions','savings_entries','gold_holdings','gold_price_quotes','monthly_budgets','financial_goals']
  loop
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Users can read their own entitlements, but cannot create or modify them.
drop policy if exists "licenses_select_own" on public.licenses;
create policy "licenses_select_own" on public.licenses for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- payment_events deliberately has no client policies: service-role backend only.
