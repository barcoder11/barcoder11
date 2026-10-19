-- Tiny Wins: Pip's Treehouse — core schema
--
-- Security model
--   * Every table has Row Level Security enabled.
--   * Signed-in users can only READ their own rows. They can never write
--     directly to any table.
--   * All writes go through SECURITY DEFINER functions below. Those functions
--     check auth.uid(), lock the user's profile row (so concurrent requests
--     are serialized), validate input, and record every XP / acorn change in
--     reward_events, whose UNIQUE (user_id, kind, ref) constraint makes each
--     reward claimable exactly once.
--   * Waitlist and rate-limit tables have no policies at all: only the
--     server (service role) can touch them.

-- ---------------------------------------------------------------------------
-- Catalog tables (public, read-only)
-- ---------------------------------------------------------------------------

create table public.quest_templates (
  id          text primary key,
  title       text not null,
  description text not null,
  category    text not null check (category in ('fitness', 'study', 'organization', 'money', 'kindness')),
  minutes     smallint not null check (minutes between 1 and 60),
  xp          smallint not null check (xp between 1 and 100),
  acorns      smallint not null check (acorns between 0 and 100),
  icon        text not null,
  pip_line    text not null,
  active      boolean not null default true
);

create table public.shop_items (
  id            text primary key,
  name          text not null,
  description   text not null,
  category      text not null check (category in ('furniture', 'plants', 'decor', 'lighting', 'walls')),
  slot          text not null check (slot in (
                  'wallpaper', 'floor', 'window', 'wall_art', 'shelf', 'lights',
                  'bed', 'rug', 'desk', 'lamp', 'plant_left', 'plant_right')),
  price         integer not null check (price >= 0),
  unlock_level  integer not null default 1 check (unlock_level >= 1),
  is_starter    boolean not null default false,
  sort          integer not null default 0
);

create table public.achievements (
  id            text primary key,
  title         text not null,
  description   text not null,
  icon          text not null,
  metric        text not null check (metric in (
                  'quests_completed', 'days_active', 'level', 'items_purchased',
                  'best_streak', 'category_quests')),
  category      text check (category in ('fitness', 'study', 'organization', 'money', 'kindness')),
  threshold     integer not null check (threshold > 0),
  acorn_reward  integer not null default 0 check (acorn_reward >= 0),
  sort          integer not null default 0,
  check ((metric = 'category_quests') = (category is not null))
);

-- ---------------------------------------------------------------------------
-- Per-user tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text check (char_length(display_name) between 1 and 40),
  timezone          text not null default 'UTC',
  timezone_changed_at timestamptz,
  goals             text[] not null default '{}'
                    check (goals <@ array['fitness', 'study', 'organization', 'money', 'kindness']::text[]),
  energy_time       text not null default 'anytime'
                    check (energy_time in ('morning', 'afternoon', 'evening', 'anytime')),
  step_size         text not null default 'small' check (step_size in ('tiny', 'small')),
  onboarded_at      timestamptz,
  xp                integer not null default 0 check (xp >= 0),
  level             integer not null default 1 check (level >= 1),
  acorns            integer not null default 0 check (acorns >= 0),
  quests_completed  integer not null default 0 check (quests_completed >= 0),
  days_active       integer not null default 0 check (days_active >= 0),
  current_streak    integer not null default 0 check (current_streak >= 0),
  best_streak       integer not null default 0 check (best_streak >= 0),
  last_active_date  date,
  last_swap_date    date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.daily_quests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  quest_date    date not null,
  slot          smallint not null check (slot between 1 and 3),
  template_id   text not null references public.quest_templates (id),
  xp_reward     smallint not null,
  acorn_reward  smallint not null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, quest_date, slot),
  unique (user_id, quest_date, template_id)
);
create index daily_quests_user_date_idx on public.daily_quests (user_id, quest_date desc);

-- Append-only reward ledger. The unique key is the idempotency guarantee.
create table public.reward_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('quest', 'level_up', 'achievement', 'purchase')),
  ref          text not null,
  xp_delta     integer not null default 0,
  acorn_delta  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index reward_events_user_created_idx on public.reward_events (user_id, created_at desc);

create table public.inventory (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  item_id      text not null references public.shop_items (id),
  acquired_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- What is placed in the room. The FK to inventory guarantees users can only
-- place items they own.
create table public.room_slots (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  slot        text not null,
  item_id     text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, slot),
  foreign key (user_id, item_id) references public.inventory (user_id, item_id) on delete cascade
);

create table public.user_achievements (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  achievement_id  text not null references public.achievements (id),
  unlocked_at     timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- Waitlist + abuse protection (server-only)
-- ---------------------------------------------------------------------------

create table public.waitlist (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null unique
                        check (email = lower(email) and char_length(email) between 3 and 254),
  status                text not null default 'pending' check (status in ('pending', 'confirmed')),
  confirm_token_hash    text unique,
  token_expires_at      timestamptz,
  confirmation_sent_at  timestamptz,
  confirmation_sends    integer not null default 0,
  confirmed_at          timestamptz,
  source                text check (char_length(source) <= 100),
  referrer              text check (char_length(referrer) <= 500),
  ip_hash               text,
  created_at            timestamptz not null default now()
);

create table public.rate_limits (
  bucket        text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (bucket, window_start)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.quest_templates   enable row level security;
alter table public.shop_items        enable row level security;
alter table public.achievements      enable row level security;
alter table public.profiles          enable row level security;
alter table public.daily_quests      enable row level security;
alter table public.reward_events     enable row level security;
alter table public.inventory         enable row level security;
alter table public.room_slots        enable row level security;
alter table public.user_achievements enable row level security;
alter table public.waitlist          enable row level security;
alter table public.rate_limits       enable row level security;

create policy "Catalog is public" on public.quest_templates for select to anon, authenticated using (active);
create policy "Catalog is public" on public.shop_items      for select to anon, authenticated using (true);
create policy "Catalog is public" on public.achievements    for select to anon, authenticated using (true);

create policy "Read own profile"      on public.profiles          for select to authenticated using (id = (select auth.uid()));
create policy "Read own quests"       on public.daily_quests      for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own rewards"      on public.reward_events     for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own inventory"    on public.inventory         for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own room"         on public.room_slots        for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own achievements" on public.user_achievements for select to authenticated using (user_id = (select auth.uid()));
-- waitlist / rate_limits: intentionally no policies.

-- Belt and braces: no direct writes for client roles, even if a policy is
-- added by mistake later.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.waitlist, public.rate_limits from anon, authenticated;
