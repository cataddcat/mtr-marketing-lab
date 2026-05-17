-- Marnthara Marketing Lab — initial schema
-- Track D1: Auth + cloud DB foundation
--
-- Apply via Supabase CLI: `supabase db push` (after `supabase link`)
-- or paste into Supabase Studio → SQL Editor.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════
-- updated_at trigger helper
-- ════════════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- orgs + members (multi-tenant primitive)
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  seats_limit int not null default 1,
  shared_brand_facts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_orgs_updated_at on public.orgs;
create trigger trg_orgs_updated_at
  before update on public.orgs
  for each row execute function public.set_updated_at();

create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  added_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists idx_org_members_user on public.org_members(user_id);

-- ════════════════════════════════════════════════════════════════════
-- profile (extends auth.users)
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  org_id uuid references public.orgs(id) on delete set null,
  tier text not null default 'free' check (tier in ('free', 'byok', 'paid')),
  tier_changed_at timestamptz not null default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  -- encrypted at rest via Supabase Edge Function (see Track D.4)
  byok_provider_keys jsonb,
  feature_overrides jsonb not null default '{}'::jsonb,
  preferred_language text not null default 'th' check (preferred_language in ('th', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row when a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════
-- App data — owned by a user, optionally shared with an org
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.brand_facts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.orgs(id) on delete set null,
  facts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_brand_facts_updated_at on public.brand_facts;
create trigger trg_brand_facts_updated_at
  before update on public.brand_facts
  for each row execute function public.set_updated_at();

create table if not exists public.customer_quotes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.orgs(id) on delete set null,
  quotes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_customer_quotes_updated_at on public.customer_quotes;
create trigger trg_customer_quotes_updated_at
  before update on public.customer_quotes
  for each row execute function public.set_updated_at();

create table if not exists public.saved_ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.orgs(id) on delete set null,
  ad jsonb not null,
  evaluation jsonb,
  performance jsonb,
  outcome text check (outcome in ('used-good', 'used-bad') or outcome is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_ads_user_created on public.saved_ads(user_id, created_at desc);
create index if not exists idx_saved_ads_org on public.saved_ads(org_id);

drop trigger if exists trg_saved_ads_updated_at on public.saved_ads;
create trigger trg_saved_ads_updated_at
  before update on public.saved_ads
  for each row execute function public.set_updated_at();

create table if not exists public.strategy_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.orgs(id) on delete set null,
  campaign_hash text not null,
  brief jsonb not null,
  edited_fields text[] not null default array[]::text[],
  drafted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, campaign_hash)
);

create index if not exists idx_strategy_briefs_user on public.strategy_briefs(user_id, drafted_at desc);

drop trigger if exists trg_strategy_briefs_updated_at on public.strategy_briefs;
create trigger trg_strategy_briefs_updated_at
  before update on public.strategy_briefs
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- Usage events — for Track B.10 cost/latency dashboard + D6 rate limiting
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.usage_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  role text not null,
  ok boolean not null,
  aborted boolean not null default false,
  latency_ms int not null,
  tokens_in int,
  tokens_out int,
  cost_thb numeric(10, 4),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_time on public.usage_events(user_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════
-- Row-Level Security
-- ════════════════════════════════════════════════════════════════════

-- Helper: is the caller a member of the given org?
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

-- profiles: a user can read/update their own row
alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

-- orgs: members read; owner update; new orgs create
alter table public.orgs enable row level security;

drop policy if exists "orgs member read" on public.orgs;
create policy "orgs member read"
  on public.orgs for select
  using (auth.uid() = owner_id or public.is_org_member(id));

drop policy if exists "orgs owner update" on public.orgs;
create policy "orgs owner update"
  on public.orgs for update
  using (auth.uid() = owner_id);

drop policy if exists "orgs create" on public.orgs;
create policy "orgs create"
  on public.orgs for insert
  with check (auth.uid() = owner_id);

-- org_members: members of an org can read; owner manages
alter table public.org_members enable row level security;

drop policy if exists "org_members member read" on public.org_members;
create policy "org_members member read"
  on public.org_members for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.orgs o where o.id = org_id and o.owner_id = auth.uid())
  );

drop policy if exists "org_members owner write" on public.org_members;
create policy "org_members owner write"
  on public.org_members for all
  using (exists (select 1 from public.orgs o where o.id = org_id and o.owner_id = auth.uid()))
  with check (exists (select 1 from public.orgs o where o.id = org_id and o.owner_id = auth.uid()));

-- Shared read+write policy template — applied to all owned tables
-- (saved_ads, brand_facts, customer_quotes, strategy_briefs)
-- Rule: a row is visible if it belongs to the caller OR (org_id is set and the caller is in that org)

alter table public.brand_facts enable row level security;
drop policy if exists "brand_facts owner+org" on public.brand_facts;
create policy "brand_facts owner+org"
  on public.brand_facts for all
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  )
  with check (auth.uid() = user_id);

alter table public.customer_quotes enable row level security;
drop policy if exists "customer_quotes owner+org" on public.customer_quotes;
create policy "customer_quotes owner+org"
  on public.customer_quotes for all
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  )
  with check (auth.uid() = user_id);

alter table public.saved_ads enable row level security;
drop policy if exists "saved_ads owner+org" on public.saved_ads;
create policy "saved_ads owner+org"
  on public.saved_ads for all
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  )
  with check (auth.uid() = user_id);

alter table public.strategy_briefs enable row level security;
drop policy if exists "strategy_briefs owner+org" on public.strategy_briefs;
create policy "strategy_briefs owner+org"
  on public.strategy_briefs for all
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  )
  with check (auth.uid() = user_id);

alter table public.usage_events enable row level security;
drop policy if exists "usage_events self read" on public.usage_events;
create policy "usage_events self read"
  on public.usage_events for select
  using (auth.uid() = user_id);

drop policy if exists "usage_events self write" on public.usage_events;
create policy "usage_events self write"
  on public.usage_events for insert
  with check (auth.uid() = user_id);
