# Tests

| Command                                    | What                                                                    | Needs                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm test`                                 | Unit tests (redirect safety, attribution, links, game math)             | nothing                                                          |
| `npm run test:db`                          | DB integration: RLS, economy, idempotency, concurrency, admin, waitlist | a running stack                                                  |
| `PAWTOPIA_STORAGE_TESTS=1 npm run test:db` | + Storage upload permissions                                            | stack with Storage                                               |
| `npm run test:e2e`                         | Playwright flows at 360 px                                              | app running (`npm run build && npm start`) + stack + mailbox API |

## Which stack?

**Recommended:** `npx supabase start`. Then set:
`TEST_SUPABASE_URL`, `TEST_DATABASE_URL`, `TEST_JWT_SECRET` (from `supabase status`).
The E2E mail helper expects a JSON API at `E2E_MAIL_API` returning
`[{subject,text,html,to}]` for `GET /messages?to=<email>` — that's the format of the
bundled mail sink; for Supabase CLI's Mailpit, adapt `tests/e2e/helpers.ts#waitForMail`.

**Docker-free (used to produce docs/acceptance.md):** `tests/local-stack/` runs Postgres 16,
GoTrue (built from github.com/supabase/auth), PostgREST, optionally Supabase Storage
(built from github.com/supabase/storage), a small API gateway and an SMTP catcher.

```bash
STACK_DIR=/tmp/pawtopia-stack GOTRUE_BIN=… POSTGREST_BIN=… bash tests/local-stack/start.sh
STORAGE_SRC=/path/to/storage bash tests/local-stack/start-storage.sh   # optional
REAL_STORAGE=1 bash tests/local-stack/reset-db.sh
```

The defaults in `tests/db/helpers.ts` and `tests/e2e/helpers.ts` match this stack.
Tests create their own users and toggle launch mode, so use a disposable database.
