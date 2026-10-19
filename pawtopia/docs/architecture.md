# Architecture

## Overview

```
Browser ──► Vercel (Next.js 16 App Router)
              │  src/proxy.ts      session refresh, route guard, analytics cookies
              │  Server Components read data with the visitor's Supabase session (RLS applies)
              │  Server Actions call trusted Postgres functions (RPC)
              ▼
           Supabase
              Auth      passwordless email (magic link + 6-digit code)
              Postgres  schema + RLS + SECURITY DEFINER game functions
              Storage   pawtopia-media bucket (admin-only writes, public CDN reads)
```

Admins upload media **directly from the browser to Supabase Storage** (avoids Vercel's
4.5 MB request limit); Storage RLS only accepts uploads from admins/editors, and the
server then registers the asset after confirming the object exists.

## Code layout

| Path                  | Contents                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `src/app/(marketing)` | `/`, `/r/[rescueSlug]`, `/animals/[slug]`, `/animals/[slug]/adopt`, waitlist, privacy, terms     |
| `src/app/(auth)`      | `/auth`, `/auth/callback` (PKCE), `/auth/confirm` (token hash), `/onboarding`                    |
| `src/app/app`         | Player game: dashboard, animal room, sanctuary, shop, stories, profile (+ server actions)        |
| `src/app/admin`       | Creator dashboard, animals, rescues + link generator, assets, analytics (+ server actions)       |
| `src/components/art`  | Placeholder SVG characters/decor/backdrops + `AnimalArt` (uploaded asset → placeholder fallback) |
| `src/components/game` | `CareRoom`, `SanctuaryEditor`, `ShopGrid`, `Stage`, HUD state                                    |
| `src/lib`             | Supabase clients, auth guards, data access, attribution, safe redirects, link builder            |
| `supabase/migrations` | Schema, RLS, game functions, storage policies                                                    |
| `supabase/seed.sql`   | Maple (playable), Ripple/Pebble/Ember/Acorn (coming soon), habitats, decor, settings             |
| `tests/`              | DB integration tests, Playwright E2E, Docker-free local stack                                    |

## Data model

Shared content: `animals`, `animal_assets`, `rescue_stories`, `story_chapters`,
`decor_catalog`, `habitats`, `app_settings`.
Per-player: `profiles`, `user_animals` (UNIQUE user+animal), `care_actions`,
`user_story_unlocks`, `wallets`, `currency_ledger`, `user_inventory`,
`sanctuaries`, `sanctuary_placements`.
Ops: `app_roles`, `waitlist_entries`, `attribution_events`, `admin_audit_logs`.

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
  The client only sends _which_ action and an idempotency key.
- **Idempotency:** care actions are UNIQUE per (user, idempotency key); ledger rows have a
  globally UNIQUE key (`welcome:<user>`, `care:<id>`, `purchase:<user>:<key>`). Replays
  return `status: "replay"` with no new rewards. Adoption is UNIQUE per user+animal.
- **Caps & cooldowns** are checked inside the same transaction under row locks:
  per-action cooldown, daily XP cap per animal, acorns for the first 3 distinct
  activities per local day (player's IANA time zone; no cron jobs).
- **Roles:** `app_roles` has no write policy — roles are granted only with the service
  role / SQL editor. Admin pages 404 for everyone else; admin functions re-check roles in
  SQL. Content edits are recorded in `admin_audit_logs` by triggers.
- **Public catalog:** anonymous users read published/coming-soon animals and published
  stories only. Chapter text is readable only once unlocked (titles via
  `animal_chapter_outline`). Drafts are visible to editors only (preview).
- **Auth:** Supabase SSR cookies; `getClaims()` verifies the JWT on every request.
  Return paths are sanitised (`lib/safe-redirect.ts`) to prevent open redirects.
  Personalised responses get `Cache-Control: private, no-store`.
- **Service role key** is used only in server code (`lib/supabase/admin.ts`): waitlist,
  account deletion and the admin bootstrap script.
- **Uploads:** bucket allows PNG/WebP/JPEG/GIF/MP4/WebM up to 50 MB (images ≤10 MB in
  the app); SVG blocked. Paths must be `animals/<slug>/…`. Media URLs contain a random id;
  draft media is unlisted but not secret (documented trade-off).
- **Waitlist:** separate from accounts; random token emailed, only its SHA-256 hash stored;
  identical response for new/duplicate emails (no enumeration); resend rate limits;
  unsubscribe and full deletion links.

## Attribution

`proxy.ts` sets a pseudonymous `pt_aid` cookie and, on `/r/<slug>?utm_*` visits, a
first-touch `pt_ft` cookie (30 days, never overwritten). Landing views and CTA clicks are
posted to `/api/track` (deduped per visitor/page/day). After verified sign-in,
`record_signup` stores first touch on the profile and links the visitor's anonymous
events. All later events (adoption, first care, purchases, D1/D7 returns) are written
server-side inside the game functions and carry the first-touch rescue/source, so
`admin_funnel` can report per episode and platform without exposing user identities.

## Key decisions

- **Cache Components disabled** — nearly every page depends on the session; the classic
  dynamic model is simpler and avoids caching personalised data.
- **No shadcn/ui** — a small set of custom primitives (`components/ui.tsx`) fits the
  cozy game look with fewer dependencies. Swappable later.
- **No 3D engine** — layered SVG/CSS scene with slot-based decorations; animation states
  via CSS, honouring `prefers-reduced-motion` and an in-app reduce-motion setting.
- **Magic link + 6-digit code** — links opened from Instagram/TikTok in-app browsers
  often land in another browser; the code (and token-hash links) work across browsers.
