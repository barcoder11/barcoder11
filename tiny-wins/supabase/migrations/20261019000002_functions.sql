-- Tiny Wins: game logic. Every function that changes data is SECURITY DEFINER
-- with an empty search_path, resolves the caller through auth.uid(), and
-- locks the caller's profile row first so all of one user's writes are
-- serialized (atomic, no double spends, no double claims).

-- ---------------------------------------------------------------------------
-- Pure helpers
-- ---------------------------------------------------------------------------

-- Total XP needed to reach a level: 25 * L * (L - 1)
--   L1 = 0, L2 = 50, L3 = 150, L4 = 300, L5 = 500 ...
-- Mirrored in src/lib/game/levels.ts (a test checks they agree).
create or replace function public.xp_for_level(p_level integer)
returns integer
language sql immutable parallel safe
set search_path = ''
as $$ select 25 * greatest(p_level, 1) * (greatest(p_level, 1) - 1) $$;

create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql immutable parallel safe
set search_path = ''
as $$ select greatest(1, floor((1 + sqrt(1 + 4 * greatest(p_xp, 0) / 25.0)) / 2)::integer) $$;

-- Acorn bonus granted once when a level is reached.
create or replace function public.level_up_bonus(p_level integer)
returns integer
language sql immutable parallel safe
set search_path = ''
as $$ select 10 + 5 * p_level $$;

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + starter furniture
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;

  insert into public.inventory (user_id, item_id)
  select new.id, s.id from public.shop_items s where s.is_starter
  on conflict do nothing;

  insert into public.room_slots (user_id, slot, item_id)
  select distinct on (s.slot) new.id, s.slot, s.id
  from public.shop_items s where s.is_starter
  order by s.slot, s.sort
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------

-- The user's current quest day. Normally "today" in their timezone; never
-- earlier than a day they already have quests for (so moving west across
-- timezones cannot re-open an earlier day).
create or replace function public._quest_day(p_user uuid, p_timezone text)
returns date
language sql stable
set search_path = ''
as $$
  select greatest(
    (now() at time zone p_timezone)::date,
    coalesce((select max(q.quest_date) from public.daily_quests q where q.user_id = p_user), '-infinity'::date)
  )
$$;

-- Picks one quest template for a user/day. Deterministic per user+day so a
-- refresh never reshuffles. Prefers the user's goals, new categories, and
-- respects "tiny steps" (<= 5 minutes) when there are enough options.
create or replace function public._pick_template(
  p_user uuid, p_day date, p_goals text[], p_step_size text,
  p_exclude text[], p_avoid_categories text[], p_prefer_goals boolean, p_salt text
)
returns public.quest_templates
language plpgsql stable
set search_path = ''
as $$
declare
  v_pick public.quest_templates;
  v_goals text[] := case when cardinality(p_goals) = 0
                         then array['fitness', 'study', 'organization', 'money', 'kindness']
                         else p_goals end;
begin
  select t.* into v_pick
  from public.quest_templates t
  where t.active
    and not (t.id = any (p_exclude))
  order by
    -- 1. goal categories first (or non-goal first when exploring)
    case when (t.category = any (v_goals)) = p_prefer_goals then 0 else 1 end,
    -- 2. a category we have not used yet today
    case when t.category = any (p_avoid_categories) then 1 else 0 end,
    -- 3. tiny steps
    case when p_step_size = 'tiny' and t.minutes > 5 then 1 else 0 end,
    -- 4. stable shuffle
    md5(p_user::text || p_day::text || p_salt || t.id)
  limit 1;
  return v_pick;
end;
$$;

-- Checks every achievement for the user and grants the ones they now meet.
-- Returns a JSON array of newly unlocked achievements.
create or replace function public._award_achievements(p_user uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_ach record;
  v_value integer;
  v_purchases integer;
  v_unlocked jsonb := '[]'::jsonb;
  v_bonus integer := 0;
begin
  select * into v_profile from public.profiles where id = p_user;
  select count(*) into v_purchases from public.reward_events where user_id = p_user and kind = 'purchase';

  for v_ach in
    select a.* from public.achievements a
    where not exists (select 1 from public.user_achievements ua
                      where ua.user_id = p_user and ua.achievement_id = a.id)
    order by a.sort
  loop
    v_value := case v_ach.metric
      when 'quests_completed' then v_profile.quests_completed
      when 'days_active'      then v_profile.days_active
      when 'level'            then v_profile.level
      when 'best_streak'      then v_profile.best_streak
      when 'items_purchased'  then v_purchases
      when 'category_quests'  then (
        select count(*)::integer from public.daily_quests q
        join public.quest_templates t on t.id = q.template_id
        where q.user_id = p_user and q.completed_at is not null and t.category = v_ach.category)
      else 0 end;

    if v_value >= v_ach.threshold then
      insert into public.user_achievements (user_id, achievement_id) values (p_user, v_ach.id)
      on conflict do nothing;
      if found then
        insert into public.reward_events (user_id, kind, ref, acorn_delta)
        values (p_user, 'achievement', v_ach.id, v_ach.acorn_reward)
        on conflict do nothing;
        if found then
          v_bonus := v_bonus + v_ach.acorn_reward;
        end if;
        v_unlocked := v_unlocked || jsonb_build_object(
          'id', v_ach.id, 'title', v_ach.title, 'icon', v_ach.icon, 'acorns', v_ach.acorn_reward);
      end if;
    end if;
  end loop;

  if v_bonus > 0 then
    update public.profiles set acorns = acorns + v_bonus, updated_at = now() where id = p_user;
  end if;
  return v_unlocked;
end;
$$;

create or replace function public._quests_json(p_user uuid, p_day date)
returns jsonb
language sql stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'slot', q.slot, 'date', q.quest_date,
    'templateId', t.id, 'title', t.title, 'description', t.description,
    'category', t.category, 'minutes', t.minutes, 'icon', t.icon, 'pipLine', t.pip_line,
    'xp', q.xp_reward, 'acorns', q.acorn_reward,
    'completedAt', q.completed_at
  ) order by q.slot), '[]'::jsonb)
  from public.daily_quests q
  join public.quest_templates t on t.id = q.template_id
  where q.user_id = p_user and q.quest_date = p_day
$$;

-- ---------------------------------------------------------------------------
-- Client-callable functions
-- ---------------------------------------------------------------------------

-- Save profile/onboarding answers. Also used by Settings.
create or replace function public.save_profile(
  p_display_name text,
  p_goals text[],
  p_energy_time text,
  p_step_size text,
  p_timezone text,
  p_finish_onboarding boolean default false
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_name text := nullif(btrim(p_display_name), '');
  v_goals text[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_name is null or char_length(v_name) > 40 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct g order by g), '{}') into v_goals from unnest(p_goals) g;
  if cardinality(v_goals) not between 1 and 5
     or not (v_goals <@ array['fitness', 'study', 'organization', 'money', 'kindness']) then
    raise exception 'invalid_goals' using errcode = '22023';
  end if;

  if p_energy_time not in ('morning', 'afternoon', 'evening', 'anytime') then
    raise exception 'invalid_energy_time' using errcode = '22023';
  end if;
  if p_step_size not in ('tiny', 'small') then
    raise exception 'invalid_step_size' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  -- Changing timezone after onboarding is limited to once a day so it
  -- can't be used to fast-forward to tomorrow's quests repeatedly.
  if v_profile.onboarded_at is not null
     and p_timezone <> v_profile.timezone
     and v_profile.timezone_changed_at > now() - interval '24 hours' then
    raise exception 'timezone_change_too_soon' using errcode = '22023';
  end if;

  update public.profiles set
    display_name = v_name,
    goals = v_goals,
    energy_time = p_energy_time,
    step_size = p_step_size,
    timezone_changed_at = case when p_timezone <> timezone and onboarded_at is not null
                               then now() else timezone_changed_at end,
    timezone = p_timezone,
    onboarded_at = case when p_finish_onboarding then coalesce(onboarded_at, now()) else onboarded_at end,
    updated_at = now()
  where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

-- Returns today's three quests, creating them on the first call of the day.
create or replace function public.get_today_quests()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_day date;
  v_pick public.quest_templates;
  v_ids text[] := '{}';
  v_cats text[] := '{}';
  v_yesterday text[];
  v_slot integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'profile_not_found';
  end if;
  v_day := public._quest_day(v_uid, v_profile.timezone);

  if not exists (select 1 from public.daily_quests where user_id = v_uid and quest_date = v_day) then
    -- Lock and re-check so two tabs opening at once create one set.
    select * into v_profile from public.profiles where id = v_uid for update;
    v_day := public._quest_day(v_uid, v_profile.timezone);

    if not exists (select 1 from public.daily_quests where user_id = v_uid and quest_date = v_day) then
      -- Don't repeat yesterday's quests.
      select coalesce(array_agg(template_id), '{}') into v_yesterday
      from public.daily_quests where user_id = v_uid and quest_date = v_day - 1;

      for v_slot in 1..3 loop
        -- Slots 1-2 follow the user's goals; slot 3 is a gentle "explore".
        v_pick := public._pick_template(
          v_uid, v_day, v_profile.goals, v_profile.step_size,
          v_ids || v_yesterday, v_cats, v_slot < 3, v_slot::text);
        if v_pick.id is null then
          -- Small catalog fallback: allow yesterday's quests.
          v_pick := public._pick_template(
            v_uid, v_day, v_profile.goals, v_profile.step_size,
            v_ids, v_cats, v_slot < 3, v_slot::text);
        end if;
        exit when v_pick.id is null;

        insert into public.daily_quests (user_id, quest_date, slot, template_id, xp_reward, acorn_reward)
        values (v_uid, v_day, v_slot, v_pick.id, v_pick.xp, v_pick.acorns);
        v_ids := v_ids || v_pick.id;
        v_cats := v_cats || v_pick.category;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'date', v_day,
    'swapAvailable', v_profile.last_swap_date is distinct from v_day,
    'quests', public._quests_json(v_uid, v_day));
end;
$$;

-- Marks a quest complete and grants its reward exactly once.
create or replace function public.complete_quest(p_quest_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_quest public.daily_quests;
  v_day date;
  v_old_level integer;
  v_new_level integer;
  v_new_xp integer;
  v_level_bonus integer := 0;
  v_lvl integer;
  v_streak integer;
  v_days integer;
  v_achievements jsonb;
  v_after public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  select * into v_quest from public.daily_quests
  where id = p_quest_id and user_id = v_uid
  for update;
  if not found then
    raise exception 'quest_not_found' using errcode = 'P0002';
  end if;

  if v_quest.completed_at is not null then
    return jsonb_build_object(
      'status', 'already_completed',
      'xpGained', 0, 'acornsGained', 0,
      'xp', v_profile.xp, 'level', v_profile.level, 'acorns', v_profile.acorns,
      'leveledUp', false, 'achievements', '[]'::jsonb);
  end if;

  v_day := public._quest_day(v_uid, v_profile.timezone);
  if v_quest.quest_date <> v_day then
    raise exception 'quest_expired' using errcode = '22023';
  end if;

  update public.daily_quests set completed_at = now() where id = v_quest.id;

  -- The ledger row is the idempotency key: a duplicate raises unique_violation
  -- and rolls the whole transaction back.
  insert into public.reward_events (user_id, kind, ref, xp_delta, acorn_delta)
  values (v_uid, 'quest', v_quest.id::text, v_quest.xp_reward, v_quest.acorn_reward);

  v_old_level := v_profile.level;
  v_new_xp := v_profile.xp + v_quest.xp_reward;
  v_new_level := greatest(v_old_level, public.level_for_xp(v_new_xp));

  for v_lvl in (v_old_level + 1)..v_new_level loop
    insert into public.reward_events (user_id, kind, ref, acorn_delta)
    values (v_uid, 'level_up', v_lvl::text, public.level_up_bonus(v_lvl))
    on conflict do nothing;
    if found then
      v_level_bonus := v_level_bonus + public.level_up_bonus(v_lvl);
    end if;
  end loop;

  -- Gentle rhythm: missing a day just starts a new streak. Nothing is lost.
  v_days := v_profile.days_active;
  v_streak := v_profile.current_streak;
  if v_profile.last_active_date is distinct from v_day then
    v_days := v_days + 1;
    v_streak := case when v_profile.last_active_date = v_day - 1 then v_streak + 1 else 1 end;
  end if;

  update public.profiles set
    xp = v_new_xp,
    level = v_new_level,
    acorns = acorns + v_quest.acorn_reward + v_level_bonus,
    quests_completed = quests_completed + 1,
    days_active = v_days,
    current_streak = v_streak,
    best_streak = greatest(best_streak, v_streak),
    last_active_date = v_day,
    updated_at = now()
  where id = v_uid;

  v_achievements := public._award_achievements(v_uid);
  select * into v_after from public.profiles where id = v_uid;

  return jsonb_build_object(
    'status', 'completed',
    'xpGained', v_quest.xp_reward,
    'acornsGained', v_quest.acorn_reward,
    'levelBonus', v_level_bonus,
    'xp', v_after.xp, 'level', v_after.level, 'acorns', v_after.acorns,
    'leveledUp', v_new_level > v_old_level,
    'achievements', v_achievements,
    'allDone', not exists (select 1 from public.daily_quests
                           where user_id = v_uid and quest_date = v_day and completed_at is null));
end;
$$;

-- Swap one unfinished quest for a different one. Once per day.
create or replace function public.swap_quest(p_quest_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_quest public.daily_quests;
  v_day date;
  v_today_ids text[];
  v_cats text[];
  v_pick public.quest_templates;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  v_day := public._quest_day(v_uid, v_profile.timezone);

  select * into v_quest from public.daily_quests
  where id = p_quest_id and user_id = v_uid for update;
  if not found then
    raise exception 'quest_not_found' using errcode = 'P0002';
  end if;
  if v_quest.quest_date <> v_day then
    raise exception 'quest_expired' using errcode = '22023';
  end if;
  if v_quest.completed_at is not null then
    raise exception 'quest_already_completed' using errcode = '22023';
  end if;
  if v_profile.last_swap_date = v_day then
    raise exception 'swap_used' using errcode = '22023';
  end if;

  select array_agg(q.template_id), array_agg(t.category) into v_today_ids, v_cats
  from public.daily_quests q join public.quest_templates t on t.id = q.template_id
  where q.user_id = v_uid and q.quest_date = v_day;

  v_pick := public._pick_template(v_uid, v_day, v_profile.goals, v_profile.step_size,
                                  v_today_ids, v_cats, true, 'swap');
  if v_pick.id is null then
    raise exception 'no_alternative' using errcode = '22023';
  end if;

  update public.daily_quests
  set template_id = v_pick.id, xp_reward = v_pick.xp, acorn_reward = v_pick.acorns
  where id = v_quest.id;
  update public.profiles set last_swap_date = v_day, updated_at = now() where id = v_uid;

  return jsonb_build_object('ok', true, 'quests', public._quests_json(v_uid, v_day));
end;
$$;

-- Buy a decoration with acorns. Each item can be bought once.
create or replace function public.purchase_item(p_item_id text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_item public.shop_items;
  v_equipped boolean := false;
  v_achievements jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  select * into v_item from public.shop_items where id = p_item_id;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.inventory where user_id = v_uid and item_id = p_item_id) then
    raise exception 'already_owned' using errcode = '22023';
  end if;
  if v_profile.level < v_item.unlock_level then
    raise exception 'level_too_low' using errcode = '22023';
  end if;
  if v_profile.acorns < v_item.price then
    raise exception 'not_enough_acorns' using errcode = '22023';
  end if;

  insert into public.inventory (user_id, item_id) values (v_uid, v_item.id);
  insert into public.reward_events (user_id, kind, ref, acorn_delta)
  values (v_uid, 'purchase', v_item.id, -v_item.price);
  update public.profiles set acorns = acorns - v_item.price, updated_at = now() where id = v_uid;

  -- Place it right away if that spot is empty.
  insert into public.room_slots (user_id, slot, item_id)
  values (v_uid, v_item.slot, v_item.id)
  on conflict (user_id, slot) do nothing;
  v_equipped := found;

  v_achievements := public._award_achievements(v_uid);

  return jsonb_build_object(
    'ok', true,
    'itemId', v_item.id,
    'equipped', v_equipped,
    'acorns', (select acorns from public.profiles where id = v_uid),
    'achievements', v_achievements);
end;
$$;

create or replace function public.equip_item(p_item_id text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform 1 from public.profiles where id = v_uid for update;

  select s.* into v_item from public.shop_items s
  join public.inventory i on i.item_id = s.id and i.user_id = v_uid
  where s.id = p_item_id;
  if not found then
    raise exception 'not_owned' using errcode = '22023';
  end if;

  insert into public.room_slots (user_id, slot, item_id, updated_at)
  values (v_uid, v_item.slot, v_item.id, now())
  on conflict (user_id, slot) do update set item_id = excluded.item_id, updated_at = now();

  return jsonb_build_object('ok', true, 'slot', v_item.slot, 'itemId', v_item.id);
end;
$$;

create or replace function public.unequip_slot(p_slot text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from public.room_slots where user_id = v_uid and slot = p_slot;
  return jsonb_build_object('ok', true, 'slot', p_slot);
end;
$$;

-- ---------------------------------------------------------------------------
-- Server-only: waitlist + rate limiting (service role)
-- ---------------------------------------------------------------------------

-- Fixed-window rate limiter. Returns true when the request is allowed.
create or replace function public.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (bucket, window_start, hits) values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  -- Opportunistic cleanup of old windows.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

-- Adds or refreshes a waitlist entry. The caller sends the confirmation email
-- only when should_send is true.
create or replace function public.waitlist_join(
  p_email text, p_token_hash text, p_source text, p_referrer text, p_ip_hash text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_row public.waitlist;
  v_email text := lower(btrim(p_email));
begin
  select * into v_row from public.waitlist where email = v_email for update;

  if not found then
    begin
      insert into public.waitlist (email, confirm_token_hash, token_expires_at, confirmation_sent_at,
                                   confirmation_sends, source, referrer, ip_hash)
      values (v_email, p_token_hash, now() + interval '7 days', now(), 1,
              left(p_source, 100), left(p_referrer, 500), p_ip_hash);
      return jsonb_build_object('state', 'created', 'should_send', true);
    exception when unique_violation then
      -- Lost a race with an identical request: treat as a duplicate.
      return jsonb_build_object('state', 'pending', 'should_send', false);
    end;
  end if;

  if v_row.status = 'confirmed' then
    return jsonb_build_object('state', 'confirmed', 'should_send', false);
  end if;

  -- Pending: resend at most every 2 minutes and 5 times total.
  if v_row.confirmation_sent_at > now() - interval '2 minutes' or v_row.confirmation_sends >= 5 then
    return jsonb_build_object('state', 'pending', 'should_send', false);
  end if;

  update public.waitlist set
    confirm_token_hash = p_token_hash,
    token_expires_at = now() + interval '7 days',
    confirmation_sent_at = now(),
    confirmation_sends = confirmation_sends + 1
  where id = v_row.id;
  return jsonb_build_object('state', 'pending', 'should_send', true);
end;
$$;

create or replace function public.waitlist_confirm(p_token_hash text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_row public.waitlist;
begin
  select * into v_row from public.waitlist where confirm_token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if v_row.status <> 'confirmed' then
    if v_row.token_expires_at < now() then
      return jsonb_build_object('ok', false, 'reason', 'expired');
    end if;
    update public.waitlist set status = 'confirmed', confirmed_at = now()
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'position', (select count(*) from public.waitlist w
                 where w.status = 'confirmed' and w.confirmed_at <= v_row.confirmed_at));
end;
$$;

-- Removes an entry using the token from any waitlist email (unsubscribe).
create or replace function public.waitlist_leave(p_token_hash text)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  delete from public.waitlist where confirm_token_hash = p_token_hash;
  return jsonb_build_object('ok', found);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

-- Supabase grants EXECUTE on new functions to anon/authenticated by default.
-- Lock everything down, then open only what each role needs.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.xp_for_level(integer),
  public.level_for_xp(integer),
  public.level_up_bonus(integer)
to anon, authenticated;

grant execute on function
  public.save_profile(text, text[], text, text, text, boolean),
  public.get_today_quests(),
  public.complete_quest(uuid),
  public.swap_quest(uuid),
  public.purchase_item(text),
  public.equip_item(text),
  public.unequip_slot(text)
to authenticated;

grant execute on function
  public.hit_rate_limit(text, integer, integer),
  public.waitlist_join(text, text, text, text, text),
  public.waitlist_confirm(text),
  public.waitlist_leave(text)
to service_role;
