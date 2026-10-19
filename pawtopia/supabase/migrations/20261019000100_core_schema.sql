-- Pawtopia core schema
-- Canonical content (animals, rescue stories, chapters, decor, habitats) is shared;
-- player state (adoptions, care, wallet, inventory, placements) is per user.
-- All player-state writes happen through SECURITY DEFINER functions (see the
-- game functions migration); clients can only read their own rows.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'editor');
create type public.content_status as enum ('draft', 'coming_soon', 'published', 'archived');
create type public.asset_state as enum (
  'cover', 'avatar', 'idle', 'happy', 'comforted', 'snacking', 'playing', 'resting', 'poster', 'teaser'
);
create type public.media_kind as enum ('image', 'video');
create type public.care_action_type as enum ('comfort', 'snack', 'play', 'rest');
create type public.recovery_phase as enum (
  'arrival', 'feeling_safe', 'learning_to_trust', 'thriving', 'new_beginning'
);
create type public.waitlist_status as enum ('pending', 'verified', 'unsubscribed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  preferred_habitat text,
  onboarding_completed_at timestamptz,
  terms_accepted_at timestamptz,
  terms_version text,
  age_confirmed_at timestamptz,
  marketing_opt_in boolean not null default false,
  reduced_motion boolean not null default false,
  first_touch jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by text,
  primary key (user_id, role)
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  normalized_email text not null unique check (normalized_email = lower(normalized_email)),
  status public.waitlist_status not null default 'pending',
  verify_token_hash text,
  verify_token_expires_at timestamptz,
  verified_at timestamptz,
  unsubscribe_token_hash text,
  unsubscribed_at timestamptz,
  promotional_opt_in boolean not null default false,
  source jsonb,
  last_sent_at timestamptz,
  send_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index waitlist_verify_token_idx on public.waitlist_entries (verify_token_hash);
create index waitlist_unsub_token_idx on public.waitlist_entries (unsubscribe_token_hash);

-- ---------------------------------------------------------------------------
-- Catalog / content
-- ---------------------------------------------------------------------------

-- Scene manifests. Each habitat lists the decoration slots that exist in it so
-- placements can be validated server-side. (Added beyond the PRD's table list
-- so new species-appropriate scenes are data, not code.)
create table public.habitats (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  scene_style text not null default 'forest',
  background_path text,
  slots jsonb not null default '[]'::jsonb check (jsonb_typeof(slots) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 40),
  species text not null check (char_length(species) between 1 and 40),
  placeholder_style text not null default 'generic'
    check (placeholder_style in ('raccoon', 'otter', 'penguin', 'fox', 'squirrel', 'generic')),
  habitat_slug text references public.habitats (slug) on update cascade,
  tagline text check (tagline is null or char_length(tagline) <= 140),
  bio text check (bio is null or char_length(bio) <= 2000),
  personality_tags text[] not null default '{}',
  appearance text check (appearance is null or char_length(appearance) <= 1000),
  colors jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 100,
  release_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index animals_status_idx on public.animals (status, sort_order);

create table public.animal_assets (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  state public.asset_state not null,
  media_kind public.media_kind not null,
  storage_path text not null unique check (storage_path ~ '^animals/[a-z0-9-]+/[A-Za-z0-9._-]+$'),
  public_url text not null check (public_url ~ '^https?://'),
  mime_type text not null,
  byte_size bigint check (byte_size is null or byte_size > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text not null check (char_length(alt_text) between 3 and 300),
  credits text check (credits is null or char_length(credits) <= 300),
  source_notes text check (source_notes is null or char_length(source_notes) <= 1000),
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Only one active asset per animal + state.
create unique index animal_assets_active_state_idx
  on public.animal_assets (animal_id, state) where is_active;

create table public.rescue_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  animal_id uuid not null references public.animals (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  synopsis text check (synopsis is null or char_length(synopsis) <= 600),
  story_body text check (story_body is null or char_length(story_body) <= 5000),
  season integer check (season is null or season > 0),
  episode integer check (episode is null or episode > 0),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  facebook_url text check (facebook_url is null or facebook_url ~ '^https://'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~ '^https://'),
  youtube_url text check (youtube_url is null or youtube_url ~ '^https://'),
  poster_asset_id uuid references public.animal_assets (id) on delete set null,
  teaser_asset_id uuid references public.animal_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  -- The fictional/AI disclosure is mandatory and cannot be switched off.
  ai_fiction_disclosure boolean not null default true check (ai_fiction_disclosure),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rescue_stories_animal_idx on public.rescue_stories (animal_id);

-- Recovery chapters. `unlock_bond_xp` is the unlock rule: a chapter unlocks
-- when the adoption's bond XP reaches it.
create table public.story_chapters (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 20),
  phase public.recovery_phase not null,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) <= 4000),
  unlock_bond_xp integer not null default 0 check (unlock_bond_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (animal_id, ordinal)
);

create table public.decor_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  price integer not null check (price >= 0),
  slot_category text not null check (slot_category in ('small', 'large', 'hanging')),
  habitat_tags text[] not null default '{}',
  art_key text not null default 'generic',
  asset_path text,
  enabled boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Player state
-- ---------------------------------------------------------------------------
create table public.user_animals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  animal_id uuid not null references public.animals (id) on delete restrict,
  nickname text check (nickname is null or char_length(nickname) between 1 and 30),
  phase public.recovery_phase not null default 'arrival',
  bond_xp integer not null default 0 check (bond_xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_chapter integer not null default 1,
  care_count integer not null default 0 check (care_count >= 0),
  adopted_at timestamptz not null default now(),
  last_cared_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, animal_id)
);
create index user_animals_animal_idx on public.user_animals (animal_id);

create table public.care_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_animal_id uuid not null references public.user_animals (id) on delete cascade,
  action_type public.care_action_type not null,
  idempotency_key uuid not null,
  local_date date not null,
  awarded_xp integer not null default 0 check (awarded_xp >= 0),
  rewarded_acorns integer not null default 0 check (rewarded_acorns >= 0),
  performed_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index care_actions_animal_day_idx on public.care_actions (user_animal_id, local_date);
create index care_actions_user_day_idx on public.care_actions (user_id, local_date);
create index care_actions_cooldown_idx on public.care_actions (user_animal_id, action_type, performed_at desc);

create table public.user_story_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_animal_id uuid not null references public.user_animals (id) on delete cascade,
  chapter_id uuid not null references public.story_chapters (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_animal_id, chapter_id)
);
create index user_story_unlocks_user_idx on public.user_story_unlocks (user_id);

create table public.sanctuaries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'My Sanctuary' check (char_length(name) between 1 and 40),
  habitat_slug text not null default 'forest-glade' references public.habitats (slug) on update cascade,
  layout_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cached acorn balance. The CHECK makes a negative balance impossible at the
-- database level; every change is mirrored by a currency_ledger row in the
-- same transaction. (Added beyond the PRD so concurrent purchases serialise on
-- a single row lock instead of summing the ledger.)
create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  acorns integer not null default 0 check (acorns >= 0),
  updated_at timestamptz not null default now()
);

create table public.currency_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  currency text not null default 'acorns' check (currency = 'acorns'),
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  source_type text not null,
  source_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index currency_ledger_user_idx on public.currency_ledger (user_id, created_at desc);

create table public.user_inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  decor_id uuid not null references public.decor_catalog (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 99),
  source text not null default 'purchase',
  acquired_at timestamptz not null default now(),
  primary key (user_id, decor_id)
);

create table public.sanctuary_placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habitat_slug text not null references public.habitats (slug) on update cascade,
  slot_id text not null,
  decor_id uuid not null references public.decor_catalog (id) on delete cascade,
  placed_at timestamptz not null default now(),
  unique (user_id, habitat_slug, slot_id),
  unique (user_id, habitat_slug, decor_id)
);

-- ---------------------------------------------------------------------------
-- Analytics, settings, audit
-- ---------------------------------------------------------------------------
create table public.attribution_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'rescue_landing_viewed', 'animal_page_viewed', 'adoption_cta_clicked',
    'waitlist_submitted', 'waitlist_verified', 'signup_started', 'signup_completed',
    'onboarding_completed', 'animal_adopted', 'first_care_completed', 'care_completed',
    'chapter_unlocked', 'decoration_purchased', 'decoration_equipped',
    'return_visit_1d', 'return_visit_7d'
  )),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id uuid,
  rescue_id uuid references public.rescue_stories (id) on delete set null,
  animal_id uuid references public.animals (id) on delete set null,
  source text check (source is null or char_length(source) <= 64),
  medium text check (medium is null or char_length(medium) <= 64),
  campaign text check (campaign is null or char_length(campaign) <= 64),
  content text check (content is null or char_length(content) <= 64),
  properties jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  occurred_at timestamptz not null default now()
);
create index attribution_events_type_time_idx on public.attribution_events (event_type, occurred_at);
create index attribution_events_rescue_idx on public.attribution_events (rescue_id, event_type);
create index attribution_events_user_idx on public.attribution_events (user_id);
create index attribution_events_anon_idx on public.attribution_events (anonymous_id);

create table public.app_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_time_idx on public.admin_audit_logs (created_at desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'waitlist_entries', 'habitats', 'animals', 'animal_assets', 'rescue_stories',
    'story_chapters', 'decor_catalog', 'user_animals', 'sanctuaries'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t
    );
  end loop;
end;
$$;

-- Keep published_at in sync with status transitions.
create or replace function public.stamp_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;
create trigger stamp_published_at before insert or update on public.animals
  for each row execute function public.stamp_published_at();
create trigger stamp_published_at before insert or update on public.rescue_stories
  for each row execute function public.stamp_published_at();

-- Create the per-user rows when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
