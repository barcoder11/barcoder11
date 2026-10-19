#!/usr/bin/env bash
# Starts the local test stack: PostgreSQL DB + GoTrue + gateway/REST stand-in.
# Requires: a running PostgreSQL (superuser postgres/postgres on :5432) and a
# GoTrue binary (GOTRUE_BIN). See README "End-to-end tests".
set -euo pipefail
cd "$(dirname "$0")/../.."

PGURL_ADMIN=${PGURL_ADMIN:-postgres://postgres:postgres@localhost:5432/postgres}
DB=${STACK_DB:-tinywins_e2e}
DBURL=postgres://postgres:postgres@localhost:5432/$DB
GOTRUE_BIN=${GOTRUE_BIN:?Set GOTRUE_BIN to the GoTrue (supabase/auth) binary}
SITE=${STACK_SITE_URL:-http://localhost:3100}
LOGDIR=${STACK_LOG_DIR:-/tmp/tinywins-stack}
mkdir -p "$LOGDIR"

psql "$PGURL_ADMIN" -v ON_ERROR_STOP=1 -q <<SQL
drop database if exists $DB with (force);
create database $DB;
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin login superuser password 'postgres'; end if;
end \$\$;
SQL
psql "$DBURL" -v ON_ERROR_STOP=1 -q -c "create schema auth authorization supabase_auth_admin;"

export GOTRUE_API_HOST=127.0.0.1 PORT=9999 GOTRUE_API_PORT=9999
export API_EXTERNAL_URL=http://localhost:54321/auth/v1
export GOTRUE_DB_DRIVER=postgres
export GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:postgres@localhost:5432/$DB?search_path=auth&sslmode=disable"
export GOTRUE_SITE_URL=$SITE GOTRUE_URI_ALLOW_LIST="$SITE/**"
export GOTRUE_DISABLE_SIGNUP=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false
export GOTRUE_JWT_SECRET=${STACK_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}
export GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_SMTP_HOST=localhost GOTRUE_SMTP_PORT=2500 GOTRUE_SMTP_ADMIN_EMAIL=pip@tinywins.test GOTRUE_SMTP_SENDER_NAME="Tiny Wins"
export GOTRUE_SMTP_USER=test GOTRUE_SMTP_PASS=test
export GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify
export GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify
export GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true
export GOTRUE_PASSWORD_MIN_LENGTH=8 GOTRUE_LOG_LEVEL=warn

node tests/local-stack/stack.mjs > "$LOGDIR/stack.log" 2>&1 &
echo $! > "$LOGDIR/stack.pid"
"$GOTRUE_BIN" > "$LOGDIR/gotrue.log" 2>&1 &
echo $! > "$LOGDIR/gotrue.pid"

for i in $(seq 1 60); do
  curl -sf http://127.0.0.1:9999/health >/dev/null && break
  sleep 0.5
done
curl -sf http://127.0.0.1:9999/health >/dev/null || { echo "GoTrue failed to start"; tail -30 "$LOGDIR/gotrue.log"; exit 1; }

psql "$DBURL" -v ON_ERROR_STOP=1 -q -f tests/local-stack/supabase-defaults.sql
for f in supabase/migrations/*.sql; do psql "$DBURL" -v ON_ERROR_STOP=1 -q -f "$f"; done

echo "Stack is up. Use these env vars:"
echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
node tests/local-stack/keys.mjs
