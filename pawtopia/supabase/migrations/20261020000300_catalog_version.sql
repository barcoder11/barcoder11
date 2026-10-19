-- Public catalog version: a counter bumped whenever anything anonymous visitors
-- can see changes (animals, their art, rescue episodes, chapter outlines, launch
-- and other app settings), whether through the app, the SQL editor or the table
-- editor. The app caches public pages keyed by this number, so a cached page is
-- never stale and a visitor's page view costs one tiny query. Safe to re-run.

create table if not exists public.catalog_version (
  id boolean primary key default true check (id),
  version bigint not null default 0,
  changed_at timestamptz not null default now()
);
insert into public.catalog_version (id) values (true) on conflict (id) do nothing;

alter table public.catalog_version enable row level security;
drop policy if exists catalog_version_read on public.catalog_version;
create policy catalog_version_read on public.catalog_version for select to anon, authenticated using (true);
revoke all on public.catalog_version from anon, authenticated;
grant select on public.catalog_version to anon, authenticated;

-- Runs as the owner: content edits come from editors, who can't write this table.
create or replace function public._bump_catalog_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.catalog_version set version = version + 1, changed_at = now() where id;
  return null;
end;
$$;
revoke all on function public._bump_catalog_version() from public, anon, authenticated;

-- One bump per statement, however many rows it touches.
do $$
declare
  t text;
begin
  foreach t in array array['animals', 'animal_assets', 'rescue_stories', 'story_chapters', 'app_settings'] loop
    execute format('drop trigger if exists bump_catalog_version on public.%I', t);
    execute format(
      'create trigger bump_catalog_version after insert or update or delete or truncate on public.%I '
      'for each statement execute function public._bump_catalog_version()',
      t
    );
  end loop;
end;
$$;
