-- Abuse protection and data retention.
--   * Fixed-window rate limiter keyed by a privacy-preserving client key
--     (HMAC of IP + date, computed by the server; raw IPs are never stored).
--   * Analytics writes and waitlist sign-ups become server-only (service role),
--     so they can't be spammed directly through the public API.
--   * run_maintenance() enforces retention limits; called daily by a cron job.
-- Safe to re-run.

create table if not exists public.rate_limits (
  bucket text not null check (char_length(bucket) <= 120),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Returns true while the bucket is within p_limit hits for the current window.
create or replace function public._rate_limit(p_bucket text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00');
  v_hits integer;
begin
  if p_bucket is null or p_bucket = '' then
    return true;
  end if;
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (left(p_bucket, 120), v_start, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Server-only funnel events (replaces the anon-callable version).
-- ---------------------------------------------------------------------------
drop function if exists public.track_event(text, uuid, text, text, jsonb);

create or replace function public.track_event(
  p_event_type text,
  p_anonymous_id uuid,
  p_user_id uuid,
  p_rescue_slug text,
  p_animal_slug text,
  p_attribution jsonb,
  p_client_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rescue public.rescue_stories;
  v_animal_id uuid;
  v_actor text := coalesce(p_user_id::text, p_anonymous_id::text);
begin
  if p_event_type not in ('rescue_landing_viewed', 'animal_page_viewed', 'adoption_cta_clicked', 'signup_started') then
    raise exception 'event_not_allowed' using errcode = '22023';
  end if;
  if v_actor is null then
    return false;
  end if;
  -- A normal visit produces a handful of events; this only stops floods.
  if not public._rate_limit('track:' || coalesce(p_client_key, v_actor), 120, interval '1 hour') then
    return false;
  end if;

  select * into v_rescue from public.rescue_stories
   where slug = p_rescue_slug and status in ('published', 'archived');
  select id into v_animal_id from public.animals
   where slug = p_animal_slug and status in ('published', 'coming_soon', 'archived');

  insert into public.attribution_events (
    event_type, user_id, anonymous_id, rescue_id, animal_id, source, medium, campaign, content, dedupe_key
  ) values (
    p_event_type,
    (select u.id from auth.users u where u.id = p_user_id),
    p_anonymous_id,
    v_rescue.id,
    coalesce(v_animal_id, v_rescue.animal_id),
    public._clean_token(p_attribution ->> 'source'),
    public._clean_token(p_attribution ->> 'medium'),
    public._clean_token(p_attribution ->> 'campaign'),
    public._clean_token(p_attribution ->> 'content'),
    p_event_type || ':' || v_actor || ':' || coalesce(v_rescue.id::text, v_animal_id::text, '-') || ':' || current_date
  )
  on conflict (dedupe_key) do nothing;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Waitlist: same behaviour plus a per-client rate limit.
-- ---------------------------------------------------------------------------
drop function if exists public.waitlist_upsert(text, text, text, boolean, jsonb);

create or replace function public.waitlist_upsert(
  p_email text, p_token_hash text, p_unsubscribe_hash text, p_opt_in boolean, p_source jsonb, p_client_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_norm text := lower(btrim(p_email));
  e public.waitlist_entries;
begin
  if v_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_norm) > 254 then
    return jsonb_build_object('action', 'invalid');
  end if;
  -- Stops one visitor from mass-submitting other people's addresses.
  if not public._rate_limit('waitlist:' || coalesce(p_client_key, v_norm), 8, interval '1 hour') then
    return jsonb_build_object('action', 'rate_limited');
  end if;

  select * into e from public.waitlist_entries where normalized_email = v_norm for update;
  if not found then
    insert into public.waitlist_entries (
      email, normalized_email, verify_token_hash, verify_token_expires_at, unsubscribe_token_hash,
      promotional_opt_in, source, last_sent_at, send_count
    ) values (
      btrim(p_email), v_norm, p_token_hash, now() + interval '48 hours', p_unsubscribe_hash,
      coalesce(p_opt_in, false), p_source, now(), 1
    )
    on conflict (normalized_email) do nothing;
    if not found then
      return jsonb_build_object('action', 'skip');
    end if;
    insert into public.attribution_events (event_type, source, campaign, properties)
    values ('waitlist_submitted', public._clean_token(p_source ->> 'source'), public._clean_token(p_source ->> 'campaign'),
            jsonb_build_object('rescue_slug', public._clean_token(p_source ->> 'rescue_slug'),
                               'form', public._clean_token(p_source ->> 'form')));
    return jsonb_build_object('action', 'send');
  end if;

  if e.status = 'verified' then
    return jsonb_build_object('action', 'skip');
  end if;

  if e.last_sent_at > now() - interval '2 minutes'
     or (e.send_count >= 5 and e.last_sent_at > now() - interval '24 hours') then
    return jsonb_build_object('action', 'skip');
  end if;

  update public.waitlist_entries set
    status = 'pending',
    verify_token_hash = p_token_hash,
    verify_token_expires_at = now() + interval '48 hours',
    unsubscribe_token_hash = p_unsubscribe_hash,
    unsubscribed_at = null,
    promotional_opt_in = coalesce(p_opt_in, false),
    last_sent_at = now(),
    send_count = case when e.last_sent_at > now() - interval '24 hours' then e.send_count + 1 else 1 end
  where id = e.id;
  return jsonb_build_object('action', 'send');
end;
$$;

-- ---------------------------------------------------------------------------
-- Retention (PRD: pseudonymous analytics with limited retention; keep only
-- essential waitlist data).
-- ---------------------------------------------------------------------------
create or replace function public.run_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate integer;
  v_waitlist integer;
  v_events integer;
  v_anon integer;
begin
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_rate = row_count;

  -- Never-confirmed waitlist sign-ups are removed after 30 days.
  delete from public.waitlist_entries
   where status = 'pending' and verified_at is null and created_at < now() - interval '30 days';
  get diagnostics v_waitlist = row_count;

  -- Anonymous-only funnel events are kept for 180 days.
  delete from public.attribution_events where user_id is null and occurred_at < now() - interval '180 days';
  get diagnostics v_events = row_count;

  -- Older events tied to players keep their aggregate value but lose the visitor id.
  update public.attribution_events set anonymous_id = null
   where anonymous_id is not null and occurred_at < now() - interval '180 days';
  get diagnostics v_anon = row_count;

  return jsonb_build_object(
    'rate_limit_rows_deleted', v_rate,
    'stale_waitlist_deleted', v_waitlist,
    'old_anonymous_events_deleted', v_events,
    'visitor_ids_cleared', v_anon,
    'ran_at', now()
  );
end;
$$;

revoke all on function public._rate_limit(text, integer, interval) from public, anon, authenticated;
revoke all on function public.track_event(text, uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.waitlist_upsert(text, text, text, boolean, jsonb, text) from public, anon, authenticated;
revoke all on function public.run_maintenance() from public, anon, authenticated;
grant execute on function public.track_event(text, uuid, uuid, text, text, jsonb, text) to service_role;
grant execute on function public.waitlist_upsert(text, text, text, boolean, jsonb, text) to service_role;
grant execute on function public.run_maintenance() to service_role;
