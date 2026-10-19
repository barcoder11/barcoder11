# Tests

| Command                                    | What                                                                         | Needs                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| `npm test`                                 | Unit tests (redirect safety, attribution, CSP, CSV, dates, game maths)       | nothing                                            |
| `npm run test:db`                          | DB integration: RLS, economy, idempotency, concurrency, admin, waitlist, ops | a running stack                                    |
| `PAWTOPIA_STORAGE_TESTS=1 npm run test:db` | + Storage upload permissions                                                 | stack with Storage                                 |
| `npm run test:e2e`                         | Playwright flows at 360 px, incl. accessibility audits and CSP checks        | app running (`npm run build && npm start`) + stack |

CI runs all of them on every push (`.github/workflows/pawtopia-ci.yml`).

## Running against the Supabase CLI (recommended)

```bash
npx supabase start            # applies supabase/migrations + supabase/seed.sql
eval "$(npx supabase status -o env)"
export TEST_SUPABASE_URL=$API_URL TEST_DATABASE_URL=$DB_URL TEST_JWT_SECRET=$JWT_SECRET
npm run test:db
```

For E2E, put the values from `npx supabase status` in `.env.local` together with
`SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325`, `EMAIL_FROM=…`, `ADMIN_EMAILS=owner-bootstrap@example.test`
and `CRON_SECRET=local-cron-secret`, then `npm run build && npm start` and `npm run test:e2e`.
Emails are read through the Mailpit API at `http://127.0.0.1:54324` (override with
`E2E_MAIL_API`). `supabase/config.toml` raises the local Auth rate limits so the suite,
which signs in many players from one IP address, never trips them.

## Docker-free stack

`tests/local-stack/` runs Postgres 16, GoTrue (built from github.com/supabase/auth),
PostgREST, optionally Supabase Storage (built from github.com/supabase/storage), a small
API gateway and an SMTP catcher that speaks the same Mailpit API subset. It exists for
environments without Docker.

```bash
STACK_DIR=/tmp/pawtopia-stack GOTRUE_BIN=… POSTGREST_BIN=… bash tests/local-stack/start.sh
STORAGE_SRC=/path/to/storage bash tests/local-stack/start-storage.sh   # optional
REAL_STORAGE=1 bash tests/local-stack/reset-db.sh
```

The defaults in `tests/db/helpers.ts` and `tests/e2e/helpers.ts` match both stacks' ports.
Tests create their own users and toggle launch mode, so use a disposable database.
