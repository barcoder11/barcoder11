#!/usr/bin/env bash
# Docker-free local Supabase-compatible stack used to verify Pawtopia in CI/sandboxes.
# Normal development should use `npx supabase start` instead (see README).
# Requires: postgres 16 binaries, a built GoTrue binary ($GOTRUE_BIN) and PostgREST ($POSTGREST_BIN).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/../.." && pwd)"
STACK_DIR="${STACK_DIR:-/tmp/pawtopia-stack}"
GOTRUE_BIN="${GOTRUE_BIN:-$STACK_DIR/gotrue}"
POSTGREST_BIN="${POSTGREST_BIN:-$STACK_DIR/postgrest}"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PGDATA="$STACK_DIR/pgdata"
LOGS="$STACK_DIR/logs"
mkdir -p "$LOGS"
eval "$(node "$HERE/keys.mjs")"
JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"
export PGPASSWORD=postgres
PSQL="psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }

fresh=0
if [ ! -d "$PGDATA" ]; then
  mkdir -p "$PGDATA"; [ "$(id -u)" = 0 ] && chown postgres "$PGDATA" "$STACK_DIR"
  echo postgres > "$STACK_DIR/pwfile"; [ "$(id -u)" = 0 ] && chown postgres "$STACK_DIR/pwfile"
  as_pg "$PG_BIN/initdb -D $PGDATA -U postgres --pwfile=$STACK_DIR/pwfile -A scram-sha-256 >/dev/null"
  fresh=1
fi
if ! pg_isready -h 127.0.0.1 -p 54322 -q; then
  [ "$(id -u)" = 0 ] && touch "$LOGS/postgres.log" && chown postgres "$LOGS/postgres.log"
  as_pg "$PG_BIN/pg_ctl -D $PGDATA -o '-p 54322 -c listen_addresses=127.0.0.1' -l $LOGS/postgres.log start >/dev/null"
  for i in $(seq 1 30); do pg_isready -h 127.0.0.1 -p 54322 -q && break; sleep 0.5; done
fi
if [ "$fresh" = 1 ]; then $PSQL -f "$HERE/bootstrap.sql"; fi

# Stop previous instances. Patterns are anchored to the start of each process's
# command line, so they can never match the shell that launched this script.
stop() { pkill -f "^$1" 2>/dev/null || true; }
stop "$GOTRUE_BIN serve"
stop "$POSTGREST_BIN "
stop "node $HERE/mail-sink.mjs"
stop "node $HERE/gateway.mjs"
sleep 0.5

nohup node "$HERE/mail-sink.mjs" > "$LOGS/mail.log" 2>&1 &
nohup node "$HERE/gateway.mjs" > "$LOGS/gateway.log" 2>&1 &
sleep 0.5

export GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1
export GOTRUE_DB_DRIVER=postgres DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:54322/postgres"
export GOTRUE_SITE_URL="${SITE_URL:-http://localhost:3000}" GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://127.0.0.1:3000/**"
export GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated
export GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false GOTRUE_DISABLE_SIGNUP=false
export GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=54325 GOTRUE_SMTP_ADMIN_EMAIL=noreply@pawtopia.local
export GOTRUE_SMTP_SENDER_NAME=Pawtopia GOTRUE_SMTP_MAX_FREQUENCY=1s GOTRUE_RATE_LIMIT_EMAIL_SENT=10000
export GOTRUE_RATE_LIMIT_VERIFY=10000 GOTRUE_RATE_LIMIT_TOKEN_REFRESH=10000 GOTRUE_RATE_LIMIT_OTP=10000
export GOTRUE_MAILER_OTP_EXP=3600 GOTRUE_MAILER_OTP_LENGTH=6
export GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=http://127.0.0.1:54324/templates/magic_link.html
export GOTRUE_MAILER_TEMPLATES_CONFIRMATION=http://127.0.0.1:54324/templates/confirmation.html
export GOTRUE_MAILER_URLPATHS_CONFIRMATION=/verify GOTRUE_LOG_LEVEL=warn
"$GOTRUE_BIN" migrate > "$LOGS/gotrue-migrate.log" 2>&1
nohup "$GOTRUE_BIN" serve > "$LOGS/gotrue.log" 2>&1 &

cat > "$STACK_DIR/postgrest.conf" <<CONF
db-uri = "postgres://authenticator:postgres@127.0.0.1:54322/postgres"
db-schemas = "public"
db-anon-role = "anon"
db-extra-search-path = "public,extensions"
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = 54330
CONF
nohup "$POSTGREST_BIN" "$STACK_DIR/postgrest.conf" > "$LOGS/postgrest.log" 2>&1 &

for i in $(seq 1 40); do curl -sf http://127.0.0.1:9999/health >/dev/null && break; sleep 0.5; done
echo "stack up: api http://127.0.0.1:54321  db postgres://postgres:postgres@127.0.0.1:54322/postgres  mail http://127.0.0.1:54324"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"
