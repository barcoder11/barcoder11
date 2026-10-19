# Architecture

## Overview

```
Browser ──► Vercel (Next.js 16 App Router)
  │           src/proxy.ts      session refresh, route guard, analytics cookies, CSP nonce
  │           Server Components read data with the visitor's Supabase session (RLS applies)
  │           Server Actions call trusted Postgres functions (RPC)
  │           /api/track        funnel events (server-side write, rate limited)
  │           /api/cron/…       daily retention job (Vercel Cron + CRON_SECRET)
  │                │
  │                ▼
  └──────────► Supabase
  sign-in        Auth      passwordless email (6-digit code + token-hash link)
  requests       Postgres  schema + RLS + SECURITY DEFINER game functions
  and uploads    Storage   pawtopia-media bucket (admin-only writes, public CDN reads)
```

Two kinds of request go **straight from the browser to Supabase**:

- **Sign-in** (`signInWithOtp`, `verifyOtp`). Supabase Auth rate-limits by IP address. If
  the server made these calls, every player would share Vercel's few IP addresses and one
  busy minute would lock everyone out. From the browser, each player has their own limit.
  The server still decides what happens after sign-in (`/auth/finish`).
- **Media uploads** by admins (avoids Vercel's 4.5 MB request limit). Storage RLS only
  accepts uploads from admins/editors; the server registers the asset after confirming
  the object exists.

## Code layout

| Path                  | Contents                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `src/app/(marketing)` | `/`, `/r/[rescueSlug]`, `/animals/[slug]`, `/animals/[slug]/adopt`, waitlist, privacy, terms     |
| `src/app/(auth)`      | `/auth`, `/auth/finish`, `/auth/confirm` (token hash), `/auth/callback` (PKCE), `/onboarding`    |
| `src/app/app`         | Player game: dashboard, animal room, sanctuary, shop, stories, profile (+ server actions)        |
| `src/app/admin`       | Creator dashboard, animals, rescues + links, decorations, waitlist, analytics (+ server actions) |
| `src/app/api`         | `/api/track` (funnel events), `/api/cron/maintenance` (retention job)                            |
| `src/components/art`  | Placeholder SVG characters/decor/backdrops + `AnimalArt` (uploaded asset → placeholder fallback) |
| `src/components/game` | `CareRoom`, `SanctuaryEditor`, `ShopGrid`, `Stage`, HUD state                                    |
| `src/lib`             | Supabase clients, auth guards, data access, attribution, CSP, safe redirects, logging            |
| `supabase/migrations` | Schema, RLS, game functions, storage policies, abuse protection, admin tools                     |
| `supabase/seed.sql`   | Maple (playable), Ripple/Pebble/Ember/Acorn (coming soon), habitats, decor, settings             |
| `supabase/setup.sql`  | Generated: all migrations + seed in one file for the SQL editor (`npm run db:bundle`)            |
| `tests/`              | DB integration tests, Playwright E2E, Docker-free local stack                                    |

## Data model

Shared content: `animals`, `animal_assets`, `rescue_stories`, `story_chapters`,
`decor_catalog`, `habitats`, `app_settings`.
Per-player: `profiles`, `user_animals` (UNIQUE user+animal), `care_actions`,
`user_story_unlocks`, `wallets`, `currency_ledger`, `user_inventory`,
`sanctuaries`, `sanctuary_placements`.
Ops: `app_roles`, `waitlist_entries`, `attribution_events`, `admin_audit_logs`, `rate_limits`.

Deviations from the PRD's table list (with reasons):

- **`habitats`** — scene manifests (slot ids, categories, positions). Placement is
  validated against this, and new species-appropriate scenes are data, not code.
- **`wallets`** — cached acorn balance with `CHECK (acorns >= 0)`. Every change writes a
  matching `currency_ledger` row in the same transaction. Concurrent purchases serialise
  on the wallet row lock, so overdrafts are impossible at the database level.
- **`story_chapters.unlock_bond_xp`** — the PRD's "unlock_rule", as a typed column.

## Security model

- **RLS on every table.** Players can only `SELECT` their own rows; there are no
  player `INSERT/UPDATE/DELETE` policies, and those privileges are also revoked.
- **All player writes go through `SECURITY DEFINER` functions** (`adopt_animal`,
  `perform_care`, `purchase_decor`, `place_decor`, …). They take the user from
  `auth.uid()`, never from arguments, and read reward amounts from `app_settings.economy`.
  The client only sends _which_ action and an idempotency key. Every function sets
  `search_path = ''` so it can't be hijacked by objects in other schemas.
- **Function allow-list.** Postgres lets everyone execute new functions by default, so
  each migration revokes and re-grants explicitly, and a test
  (`tests/db/admin.test.ts`) fails if visitors or players can call anything not on the list.
- **Idempotency:** care actions are UNIQUE per (user, idempotency key); ledger rows have a
  globally UNIQUE key (`welcome:<user>`, `care:<id>`, `purchase:<user>:<key>`). Replays
  return `status: "replay"` with no new rewards. Adoption is UNIQUE per user+animal.
- **Caps & cooldowns** are checked inside the same transaction under row locks:
  per-action cooldown, daily XP cap per animal, acorns for the first 3 distinct
  activities per local day. The "day" is the player's own calendar day in their IANA
  timezone (`_local_date()` in SQL, `localDate()` in `lib/game.ts`; a test keeps the two
  in agreement, including UTC+14, UTC−11 and +5:45 zones). No cron job resets anything.
- **Roles:** `app_roles` has no write policy — roles are granted only with the service
  role / SQL editor, or automatically for emails listed in `ADMIN_EMAILS` on their first
  verified sign-in. Admin pages 404 for everyone else; admin functions re-check roles in
  SQL. Content edits, contact exports and waitlist deletions are recorded in
  `admin_audit_logs`.
- **Public catalog:** anonymous users read published/coming-soon animals and published
  stories only. Chapter text is readable only once unlocked (titles via
  `animal_chapter_outline`). Drafts are visible to editors only (preview).
- **Auth:** Supabase SSR cookies; `getClaims()` verifies the JWT on every request.
  Return paths are sanitised (`lib/safe-redirect.ts`) to prevent open redirects; values
  stored in user metadata (editable by the user) are sanitised again when read.
  Personalised responses get `Cache-Control: private, no-store`.
- **Service role key** is used only in server code (`lib/supabase/admin.ts`): analytics
  writes, waitlist, account deletion, the retention job and the admin bootstrap.
- **Uploads:** bucket allows PNG/WebP/JPEG/GIF/MP4/WebM up to 50 MB (images ≤10 MB in
  the app); SVG blocked. Paths must be `animals/<slug>/…`. Media URLs contain a random id;
  draft media is unlisted but not secret (documented trade-off).
- **Waitlist:** separate from accounts; random token emailed, only its SHA-256 hash stored;
  identical response for new/duplicate emails (no enumeration); resend and per-client
  rate limits; unsubscribe and full deletion links.
- **Contact exports** (`/admin/waitlist`): admin-only, include only people who opted in,
  and every export is audited. CSV cells starting with `= + - @` are neutralised so a
  crafted email can't run a spreadsheet formula.

### Content-Security-Policy

`src/proxy.ts` generates a nonce per request and sends a strict policy (`src/lib/csp.ts`):
scripts must carry the nonce (`'strict-dynamic'`, no `unsafe-inline`), network requests,
images and media may only go to this site and the Supabase project, the site can't be
framed, and `object-src`/`base-uri`/`form-action` are locked down. Styles allow inline
`style` attributes because React uses them for dynamic values; no user content is ever
rendered as HTML. An E2E test fails on any CSP violation.

### Abuse protection and data retention

- `/api/track` validates input, then writes through `track_event` with the service role.
  Each client is limited to 120 events per hour, keyed by an HMAC of its IP address and the
  date (`lib/request.ts`), so raw IPs are never stored and keys rotate daily.
- Waitlist sign-ups are limited to 8 per client per hour (`waitlist_upsert`).
- A daily job (`vercel.json` → `/api/cron/maintenance` → `run_maintenance()`) deletes
  rate-limit counters after 2 days, unconfirmed waitlist entries after 30 days, and
  anonymous analytics after 180 days (events tied to an account lose their visitor id).
- Sign-in emails are rate-limited by Supabase Auth itself (per IP, configured in the
  Supabase dashboard).

### Errors and logging

- Data reads fail loudly: `lib/data/db.ts` throws on any PostgREST error (logged with a
  context label and error code), and error boundaries show a friendly retry screen.
- Forms and buttons survive network failures: server-action calls are wrapped
  (`lib/safe-action.ts`) so a dropped connection shows "We couldn't reach Pawtopia…"
  instead of freezing, while redirects still work.
- Server logs are single-line JSON (`lib/log.ts`) and never contain emails, tokens or IP
  addresses — only codes and counts.

## Attribution

`proxy.ts` sets a pseudonymous `pt_aid` cookie and, on `/r/<slug>?utm_*` visits, a
first-touch `pt_ft` cookie (30 days, never overwritten). Landing views and CTA clicks are
posted to `/api/track` (deduped per visitor/page/day). After verified sign-in,
`record_signup` stores first touch on the profile and links the visitor's anonymous
events. If the email link is opened in a different browser (common from Instagram/TikTok),
the return path and first touch come from the new account's sign-up metadata instead.
All later events (adoption, first care, purchases, D1/D7 returns) are written
server-side inside the game functions and carry the first-touch rescue/source, so
`admin_funnel` can report per episode and platform without exposing user identities.

## Performance

Pages send visitors only the framework's JavaScript plus ~13 KB of app code (no database
or validation libraries reach the browser). Server time is dominated by database round
trips, so the code keeps them few and parallel:

- Independent queries run together (`Promise.all`): the game layout's session, wallet and
  role checks are one round, and a page never waits for data it doesn't depend on.
- Related rows come in one request through embedded selects (adoption + animal + art,
  sanctuary + habitat, rescue + animal).
- Work that doesn't change the page — return-visit tracking — runs after the response is
  sent (`after()`), so it never delays rendering.
- **Public catalog cache.** Anonymous visitors (nearly all traffic from the videos) see the
  same published content, so their catalog reads are shared across requests and keyed by
  `public.catalog_version`, a counter that database triggers bump whenever animals, art,
  rescues, chapters or settings change — by any path, including the SQL and table editors.
  A cached landing page costs one single-row read (plus the analytics beacon), and is never
  stale. Signed-in visitors always read live through their session (`lib/data/catalog-cache.ts`).
  If the counter table is missing, pages are served uncached rather than failing.
- Session checks are local with Supabase's asymmetric JWT signing keys (cached JWKS);
  keep Vercel and Supabase in the same region (see docs/deployment.md).

Measured on the local stack with 20 ms of simulated latency per database call, signed-in
pages respond about 50 ms sooner than before these changes. To reproduce, start the
gateway with `GATEWAY_LOG=1` (one line per request) and `GATEWAY_DELAY_MS=20`.

## Typed database access

Every Supabase client is created with a `Database` type, so table, column and function
names, argument types and result shapes are checked at compile time.

- `src/lib/database.types.ts` is generated from the migrated schema (`npm run db:types`);
  CI regenerates it on a fresh database and fails if the committed file differs.
- `src/lib/database.ts` adds what the generator can't know: which function arguments accept
  NULL, and the exact jsonb each function returns (every `status` value is a typed union).
- `src/lib/types.ts` builds the app's shapes from the generated rows, narrowing only jsonb
  columns and CHECK-constrained text columns. Validation reuses the database enums
  (`Constants`), so a new animation state or care action can't drift out of sync.

## Quality gates

Every push runs `.github/workflows/pawtopia-ci.yml`:

- **checks** — Prettier, ESLint, TypeScript, unit tests, knip (unused files/exports/
  dependencies), `setup.sql` drift check, `npm audit` of production dependencies, and a
  production build with no Supabase configured.
- **integration** — starts the official local Supabase stack (`supabase start`, which
  applies the migrations and seed), checks the generated types are current, runs the
  database tests including Storage, builds and
  starts the app, and runs the Playwright suite on a 360 px phone viewport (accessibility
  audits included).

## Key decisions

- **Cache Components disabled** — nearly every page depends on the session; the classic
  dynamic model is simpler and avoids caching personalised data.
- **No shadcn/ui** — a small set of custom primitives (`components/ui.tsx`) fits the
  cozy game look with fewer dependencies. Swappable later.
- **No 3D engine** — layered SVG/CSS scene with slot-based decorations; animation states
  via CSS, honouring `prefers-reduced-motion` and an in-app reduce-motion setting.
- **6-digit code + token-hash link** — links opened from Instagram/TikTok in-app browsers
  often land in another browser; the code and token-hash links work across browsers
  (PKCE links don't). Opening a link shows a "Sign in to Pawtopia" button rather than
  signing in on page load, so email scanners that prefetch links can't use up the token.

## Known limitations and accepted risks

- **Dev-only advisory:** `npm audit` reports a `braces` advisory reachable only through
  `eslint-config-next` (lint tooling, never shipped). No fixed version exists upstream yet;
  production dependencies audit clean, and CI blocks any high-severity production advisory.
- **Draft media is unlisted, not secret** — anyone with an uploaded file's random URL can
  view it before publication. Don't upload anything confidential.
- **Supabase Auth rate limits are per IP.** Players behind one shared IP (a school or
  office network) share a limit; raise the limits in the Supabase dashboard if needed.
- The privacy policy and terms are drafts and need legal review before launch.
