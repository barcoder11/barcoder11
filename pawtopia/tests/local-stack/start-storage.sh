#!/usr/bin/env bash
# Optional: runs the real Supabase Storage API (built from github.com/supabase/storage
# into $STORAGE_SRC) on :5000 with a local file backend. Run after start.sh.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
STACK_DIR="${STACK_DIR:-/tmp/pawtopia-stack}"
STORAGE_SRC="${STORAGE_SRC:?set STORAGE_SRC to a built supabase/storage checkout}"
eval "$(node "$HERE/keys.mjs")"
mkdir -p "$STACK_DIR/storage-data" "$STACK_DIR/logs"
# Anchored so it can't match the shell that launched this script.
pkill -f "^node $STORAGE_SRC/dist/start/server.js" 2>/dev/null || true
cd "$STORAGE_SRC"
env SERVER_HOST=127.0.0.1 SERVER_PORT=5000 SERVER_ADMIN_PORT=5001 \
  AUTH_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long AUTH_JWT_ALGORITHM=HS256 \
  ANON_KEY="$ANON_KEY" SERVICE_KEY="$SERVICE_KEY" \
  DATABASE_URL=postgresql://supabase_storage_admin:postgres@127.0.0.1:54322/postgres \
  DB_INSTALL_ROLES=false DB_ANON_ROLE=anon DB_SERVICE_ROLE=service_role DB_AUTHENTICATED_ROLE=authenticated \
  DB_SUPER_USER=supabase_storage_admin STORAGE_BACKEND=file STORAGE_FILE_BACKEND_PATH="$STACK_DIR/storage-data" \
  TENANT_ID=stub REGION=local GLOBAL_S3_BUCKET=stub UPLOAD_FILE_SIZE_LIMIT=52428800 \
  IMAGE_TRANSFORMATION_ENABLED=false PG_QUEUE_ENABLE=false RATE_LIMITER_ENABLED=false NODE_ENV=production \
  nohup node "$STORAGE_SRC/dist/start/server.js" > "$STACK_DIR/logs/storage.log" 2>&1 &
for i in $(seq 1 40); do curl -sf http://127.0.0.1:5000/status >/dev/null && break; sleep 0.5; done
curl -sf http://127.0.0.1:5000/status >/dev/null && echo "storage up on :5000" || { tail -20 "$STACK_DIR/logs/storage.log"; exit 1; }
