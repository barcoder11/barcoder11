-- Row Level Security and role helpers.
-- Principles:
--   * Every table has RLS enabled. No table is writable by players directly.
--   * Players can SELECT only their own rows.
--   * Anonymous visitors can read the published catalog only.
--   * Content tables are writable by admins/editors; settings & roles by admins only.
--   * app_roles has no write policy at all: roles are granted with the SQL
--     editor / service role (see README "Admin bootstrap").

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_roles r
    where r.user_id = auth.uid() and r.role = 'admin'
  );
$$;

create or replace function public.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'editor')
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_content_editor() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_content_editor() to anon, authenticated, service_role;

-- Internal trigger helpers must never be callable through the API.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.stamp_published_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Enable RLS everywhere.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'app_roles', 'waitlist_entries', 'habitats', 'animals', 'animal_assets',
    'rescue_stories', 'story_chapters', 'decor_catalog', 'user_animals', 'care_actions',
    'user_story_unlocks', 'sanctuaries', 'wallets', 'currency_ledger', 'user_inventory',
    'sanctuary_placements', 'attribution_events', 'app_settings', 'admin_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Defence in depth: players never write player-state tables directly, even if
-- a permissive policy were added by mistake later.
revoke insert, update, delete, truncate on
  public.profiles, public.app_roles, public.waitlist_entries, public.user_animals,
  public.care_actions, public.user_story_unlocks, public.sanctuaries, public.wallets,
  public.currency_ledger, public.user_inventory, public.sanctuary_placements,
  public.attribution_events, public.admin_audit_logs
from anon, authenticated;
revoke truncate on all tables in schema public from anon, authenticated;
-- Anonymous visitors never write anything directly.
revoke insert, update, delete on all tables in schema public from anon;

-- ---------------------------------------------------------------- accounts
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = auth.uid());

create policy app_roles_select_own on public.app_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy waitlist_admin_read on public.waitlist_entries
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- catalog
create policy habitats_read on public.habitats
  for select to anon, authenticated using (true);
create policy habitats_admin_write on public.habitats
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy animals_read on public.animals
  for select to anon, authenticated using (
    status in ('published', 'coming_soon')
    or public.is_content_editor()
    or (
      status = 'archived'
      and exists (
        select 1 from public.user_animals ua
        where ua.animal_id = animals.id and ua.user_id = auth.uid()
      )
    )
  );
create policy animals_editor_insert on public.animals
  for insert to authenticated with check (public.is_content_editor());
create policy animals_editor_update on public.animals
  for update to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy animals_editor_delete on public.animals
  for delete to authenticated using (public.is_content_editor() and status = 'draft');

create policy animal_assets_read on public.animal_assets
  for select to anon, authenticated using (
    public.is_content_editor()
    or (is_active and exists (select 1 from public.animals a where a.id = animal_assets.animal_id))
  );
create policy animal_assets_editor_write on public.animal_assets
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());

create policy rescue_stories_read on public.rescue_stories
  for select to anon, authenticated using (
    status in ('published', 'archived') or public.is_content_editor()
  );
create policy rescue_stories_editor_insert on public.rescue_stories
  for insert to authenticated with check (public.is_content_editor());
create policy rescue_stories_editor_update on public.rescue_stories
  for update to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy rescue_stories_editor_delete on public.rescue_stories
  for delete to authenticated using (public.is_content_editor() and status = 'draft');

-- Chapter text is only readable once unlocked (titles are exposed through
-- animal_chapter_outline()).
create policy story_chapters_read on public.story_chapters
  for select to authenticated using (
    public.is_content_editor()
    or exists (
      select 1 from public.user_story_unlocks u
      where u.chapter_id = story_chapters.id and u.user_id = auth.uid()
    )
  );
create policy story_chapters_editor_write on public.story_chapters
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());

create policy decor_read on public.decor_catalog
  for select to anon, authenticated using (enabled or public.is_content_editor());
create policy decor_admin_write on public.decor_catalog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- player state (read own)
create policy user_animals_select_own on public.user_animals
  for select to authenticated using (user_id = auth.uid());
create policy care_actions_select_own on public.care_actions
  for select to authenticated using (user_id = auth.uid());
create policy user_story_unlocks_select_own on public.user_story_unlocks
  for select to authenticated using (user_id = auth.uid());
create policy sanctuaries_select_own on public.sanctuaries
  for select to authenticated using (user_id = auth.uid());
create policy wallets_select_own on public.wallets
  for select to authenticated using (user_id = auth.uid());
create policy currency_ledger_select_own on public.currency_ledger
  for select to authenticated using (user_id = auth.uid());
create policy user_inventory_select_own on public.user_inventory
  for select to authenticated using (user_id = auth.uid());
create policy sanctuary_placements_select_own on public.sanctuary_placements
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- analytics / settings / audit
create policy attribution_admin_read on public.attribution_events
  for select to authenticated using (public.is_admin());

create policy app_settings_public_read on public.app_settings
  for select to anon, authenticated using (key in ('launch', 'economy') or public.is_admin());
create policy app_settings_admin_write on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_read on public.admin_audit_logs
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- audit trail for content changes
create or replace function public.audit_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_diff jsonb;
begin
  if tg_op = 'DELETE' then
    v_id := (to_jsonb(old) ->> case when tg_table_name in ('app_settings') then 'key'
                                    when tg_table_name = 'habitats' then 'slug' else 'id' end);
    v_diff := jsonb_build_object('old', to_jsonb(old));
  else
    v_id := (to_jsonb(new) ->> case when tg_table_name in ('app_settings') then 'key'
                                    when tg_table_name = 'habitats' then 'slug' else 'id' end);
    if tg_op = 'UPDATE' then
      select jsonb_object_agg(n.key, n.value) into v_diff
      from jsonb_each(to_jsonb(new)) n
      where n.key not in ('updated_at') and (to_jsonb(old) -> n.key) is distinct from n.value;
      if v_diff is null then
        return new;
      end if;
      -- Keep the trail small: long text fields are recorded as "changed" only.
      select jsonb_object_agg(k, case when length(v::text) > 300 then to_jsonb('(changed)'::text) else v end)
        into v_diff from jsonb_each(v_diff) as e(k, v);
    else
      v_diff := jsonb_build_object('created', true);
    end if;
  end if;
  insert into public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, diff)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_diff);
  return coalesce(new, old);
end;
$$;
revoke all on function public.audit_content_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'animals', 'animal_assets', 'rescue_stories', 'story_chapters', 'decor_catalog', 'habitats', 'app_settings'
  ] loop
    execute format(
      'create trigger audit_content_change after insert or update or delete on public.%I
         for each row execute function public.audit_content_change()', t
    );
  end loop;
end;
$$;
