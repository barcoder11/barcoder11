-- Admin tools: waitlist management and consented contact exports.
-- Exports include only people who asked to hear from Pawtopia, and every
-- export / deletion is written to the admin audit log. Safe to re-run.

-- Contacts for announcements:
--   'waitlist' → confirmed waitlist sign-ups (they asked to be told when the game opens)
--   'players'  → players who opted into "new rescue" emails
create or replace function public.admin_export_contacts(p_kind text)
returns table (email text, opted_in_to_news boolean, since timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public._require_admin();
  v_count integer;
begin
  if p_kind = 'waitlist' then
    return query
      select w.email, w.promotional_opt_in, coalesce(w.verified_at, w.created_at)
        from public.waitlist_entries w
       where w.status = 'verified'
       order by w.verified_at;
  elsif p_kind = 'players' then
    return query
      select u.email::text, true, p.updated_at
        from public.profiles p join auth.users u on u.id = p.user_id
       where p.marketing_opt_in and u.email is not null
       order by p.updated_at;
  else
    raise exception 'unknown_export' using errcode = '22023';
  end if;
  get diagnostics v_count = row_count;
  insert into public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, diff)
  values (v_admin, 'export', 'contacts', p_kind, jsonb_build_object('rows', v_count));
end;
$$;

create or replace function public.admin_delete_waitlist_entry(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := public._require_admin();
begin
  delete from public.waitlist_entries where id = p_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  insert into public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, diff)
  values (v_admin, 'delete', 'waitlist_entries', p_id::text, jsonb_build_object('reason', 'admin request'));
  return jsonb_build_object('status', 'deleted');
end;
$$;

revoke all on function public.admin_export_contacts(text) from public, anon, authenticated;
revoke all on function public.admin_delete_waitlist_entry(uuid) from public, anon, authenticated;
grant execute on function public.admin_export_contacts(text) to authenticated;
grant execute on function public.admin_delete_waitlist_entry(uuid) to authenticated;
