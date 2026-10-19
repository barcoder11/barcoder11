#!/usr/bin/env bash
# Drops app data and re-applies supabase/migrations + supabase/seed.sql to the local stack.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/../.." && pwd)"
export PGPASSWORD=postgres
PSQL="psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$PSQL <<SQL
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
delete from auth.users;
drop trigger if exists on_auth_user_created on auth.users;
SQL
if [ -f "$HERE/storage-shim.sql" ] && [ "${REAL_STORAGE:-0}" != 1 ]; then $PSQL -f "$HERE/storage-shim.sql"; fi
for f in "$APP"/supabase/migrations/*.sql; do echo "migrate: $(basename "$f")"; $PSQL -f "$f"; done
$PSQL -f "$APP/supabase/seed.sql"
$PSQL -c "notify pgrst, 'reload schema'"
echo "database reset"
