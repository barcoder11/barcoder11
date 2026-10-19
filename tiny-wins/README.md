# Tiny Wins: Pip's Treehouse 🌰

**Big dreams. Small steps. One acorn at a time.**

Tiny Wins is a cozy, gamified self-improvement web app that goes with the Pip animated series on TikTok. Players get three tiny real-life quests a day, earn XP and acorns, level up Pip, and decorate his treehouse.

- **Marketing site + waitlist** with real, database-backed signups, email confirmation, duplicate handling and abuse protection
- **Accounts** with Supabase Auth: verified email, login, password reset, logout, account deletion
- **Onboarding**: name, goals (fitness, studying, organization, saving money, kindness), best time of day, step size, timezone
- **Daily quests**: three per day, matched to your goals, reset at midnight in your timezone, one free swap per day, never any penalty for missing a day
- **Rewards**: XP, levels with one-time acorn bonuses, 19 achievements. All validated and applied by the database, each reward claimable exactly once
- **Pip's treehouse**: layered 2D scene with 12 decoration spots, sky that follows your local time, four visible upgrade stages at levels 3, 5 and 8
- **Shop**: 32 decorations (plus 4 starter items) with prices and level locks; buy, place, swap, remove
- **Progress**: level, stats, weekly chart, wins by goal, achievements, reward history
- **Settings**: profile and goals, light/dark/auto theme, reduce motion, password, logout, delete account

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui-style components on Radix primitives, `tw-animate-css` |
| Animation | Motion (the maintained successor to Framer Motion), with reduced-motion support |
| Backend | Supabase Auth + PostgreSQL with Row Level Security and SQL functions |
| Email | Supabase Auth emails (account), Resend (waitlist) |
| Tests | Vitest (unit + database), Playwright (end-to-end) |
| Hosting | Vercel (or any Node host) |

## Project structure

```
tiny-wins/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/        landing, privacy, terms, waitlist confirm/leave
│  │  ├─ (auth)/             login, signup, forgot/reset password, check email
│  │  ├─ (app)/              home, quests, treehouse, shop, progress, settings (signed-in)
│  │  ├─ onboarding/         first-run questions
│  │  ├─ auth/confirm/       handles links from auth emails
│  │  └─ api/waitlist/       waitlist signup endpoint
│  ├─ components/
│  │  ├─ ui/                 shadcn/ui-style building blocks
│  │  ├─ pip/                Pip component + asset registry (swap in official art here)
│  │  ├─ treehouse/          scene, slots, item artwork registry, editor
│  │  ├─ quests/ shop/ app/ marketing/ auth/ settings/ ...
│  ├─ lib/
│  │  ├─ actions/            server actions (auth, game, waitlist)
│  │  ├─ data/queries.ts     data access layer (runs as the signed-in user)
│  │  ├─ game/               types, level math, constants
│  │  ├─ supabase/           browser, server, admin (server-only) and proxy clients
│  │  └─ waitlist/           validation, tokens, email, Turnstile
│  └─ proxy.ts               session refresh + route protection (Next 16 "proxy", formerly middleware)
├─ supabase/
│  ├─ migrations/            schema + RLS, game functions, catalog (quests/items/achievements)
│  ├─ templates/             auth email templates (work across browsers/devices)
│  └─ config.toml            Supabase CLI local config
├─ public/pip/               Pip artwork (placeholder SVGs)
└─ tests/
   ├─ unit/                  pure logic
   ├─ db/                    migrations, RLS and reward logic against real PostgreSQL
   ├─ e2e/                   Playwright: public site + full user journey
   └─ local-stack/           Docker-free Supabase-like stack for e2e (test-only)
```

---

## Run it locally

### 1. Install

```bash
cd tiny-wins
npm install
cp .env.example .env.local
```

You need Node.js 20.9+.

### 2. Get a Supabase database

**Option A: Supabase CLI (needs Docker)**

```bash
npx supabase start          # starts Postgres, Auth, API, and a mail viewer
npx supabase db reset       # applies supabase/migrations
npx supabase status         # prints the URL and keys
```

Put `API URL`, `anon key` and `service_role key` into `.env.local`. Auth emails show up in the mail viewer at http://localhost:54324.

**Option B: a free hosted Supabase project.** Follow "Set up Supabase" below and use those keys locally.

### 3. Start

```bash
npm run dev
```

Open http://localhost:3000.

Without Supabase keys, the marketing site still works. Login and signup show a clear "accounts aren't connected yet" notice, and the waitlist returns an honest "not connected" error instead of pretending.

Without Resend keys in development, waitlist confirmation links are printed in the terminal and shown under the form, so you can test the whole flow.

---

## Set up Supabase (production)

1. **Create a project** at https://supabase.com.
2. **Run the migrations.** Either:
   - `npx supabase link --project-ref YOUR_REF && npx supabase db push`, or
   - paste the three files in `supabase/migrations/` into the SQL Editor, in order.
3. **Keys.** Project Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`)
4. **Auth → URL Configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/confirm` (plus `http://localhost:3000/auth/confirm` for local dev, and your Vercel preview URL pattern if you use previews)
5. **Auth → Providers → Email**: keep **Confirm email** turned on.
6. **Auth → Email Templates**: paste `supabase/templates/confirmation.html` into "Confirm signup" and `recovery.html` into "Reset password". These links use `token_hash`, so they work even if someone signs up inside the TikTok in-app browser and opens the email somewhere else. (The default templates only work in the same browser.)
7. **Auth → SMTP Settings**: set up custom SMTP (Resend works here too). Supabase's built-in email is for testing only and sends just a few emails per hour.

## Set up waitlist email (Resend)

1. Create an account at https://resend.com and verify your sending domain.
2. Create an API key → `RESEND_API_KEY`.
3. Set `WAITLIST_FROM_EMAIL`, for example `Pip <pip@your-domain.com>`.

In production, the waitlist refuses signups (with a friendly message) until email is configured, so nobody gets stuck unconfirmed.

**Optional bot protection:** create a Cloudflare Turnstile widget and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

**Optional invite-only mode:** set `SIGNUP_MODE=waitlist` so only confirmed waitlist emails can create accounts.

## Deploy to Vercel

1. Import this GitHub repo in Vercel.
2. **Root Directory: `tiny-wins`** (the app lives in this folder).
3. Add the environment variables from `.env.example` (Production and Preview).
4. Set `NEXT_PUBLIC_SITE_URL` to your production URL and add it to Supabase redirect URLs.
5. Deploy. Add your domain, then update Supabase's Site URL.

For TikTok, link to `https://your-domain.com/?utm_source=tiktok`. Visitors get a TikTok-specific greeting, and the source is saved with their waitlist entry.

---

## How security works

- **Row Level Security on every table.** Signed-in users can only read their own rows. Catalog tables (quests, items, achievements) are public read-only.
- **No direct writes from clients.** `insert/update/delete` are revoked for `anon` and `authenticated`. Every change goes through a `SECURITY DEFINER` function that checks `auth.uid()`, validates input, and locks the user's profile row so one user's requests run one at a time.
- **Rewards can't be double-claimed.** Every XP/acorn change is a row in `reward_events` with `UNIQUE (user_id, kind, ref)`. Completing the same quest twice, even with 8 simultaneous requests, pays out once (tested).
- **Server-side amounts.** Reward amounts are snapshotted when the day's quests are created. Prices and level locks are checked in the database. The browser never sends amounts.
- **Fair days.** Quest days follow the user's timezone and can never go backwards. Timezone changes are limited to once every 24 hours so they can't be used to skip ahead.
- **Secrets stay on the server.** The service-role key is only read in `src/lib/supabase/admin.ts`, which imports `server-only` (any accidental client import fails the build). It's only used for the waitlist and account deletion.
- **Waitlist abuse protection:** strict email validation and normalization, disposable-domain blocking, a hidden honeypot field, a minimum fill time, per-IP and per-email rate limits (IPs are stored only as salted hashes), optional Turnstile, confirmation tokens stored only as SHA-256 hashes, link expiry, resend cooldown, and a click-to-confirm page so email link scanners can't confirm for you.
- **Account deletion** deletes the auth user, which cascades to every Tiny Wins table.
- Redirect targets are restricted to same-site paths, and security headers are set in `next.config.ts`.

Quest completion is an honor system. That's intentional for a kind, low-pressure MVP.

---

## Replace Pip with the official artwork

All Pip images are listed in **`src/components/pip/pip-assets.ts`**:

```ts
export const PIP_ASSETS = {
  idle:   { src: "/pip/pip-idle.svg", alt: "..." },
  happy:  { src: "/pip/pip-happy.svg", alt: "..." },
  cheer:  { src: "/pip/pip-cheer.svg", alt: "..." },
  wave:   { src: "/pip/pip-wave.svg", alt: "..." },
  sleepy: { src: "/pip/pip-sleepy.svg", alt: "..." },
};
```

1. Export each pose as a transparent PNG/WebP/SVG with a **6:7 aspect ratio** (for example 960×1120), feet at the bottom edge.
2. Put the files in `public/pip/` and update the paths above (or keep the same file names).
3. If your art has a different ratio, update `PIP_ASPECT` in the same file.

Treehouse decorations work the same way in **`src/components/treehouse/item-art.tsx`**: replace any entry with an image URL (`"quilt-bed": "/items/quilt-bed.png"`) and it's drawn in that item's spot. Spot sizes are in `slots.ts`. The scene is a fixed 400×500 coordinate system, so a future illustrated or 3D-rendered version only needs new art per spot.

## Add quests, items or achievements

Edit `supabase/migrations/20261019000003_catalog.sql` (it upserts, so it's safe to re-run) or add a new migration with the same `insert ... on conflict do update` pattern. New shop items need artwork in `item-art.tsx`; a unit test fails if any item is missing art.

---

## Scripts and tests

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # route types + TypeScript
npm test             # unit tests
npm run test:db      # database tests (needs TEST_DATABASE_URL, see below)
npm run test:e2e     # Playwright (see below)
```

**Database tests** run the real migrations against an empty, throwaway PostgreSQL database (with a tiny stand-in for Supabase's `auth` schema) and check RLS, permissions, reward idempotency under concurrency, levels, streaks, timezones, swaps, shop, room placement, waitlist and deletion:

```bash
createdb tinywins_test
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/tinywins_test npm run test:db
```

⚠️ This drops and recreates the `public` and `auth` schemas in that database. Never point it at real data.

**End-to-end tests**

- `tests/e2e/public.spec.ts`: landing page, demos, TikTok greeting, waitlist validation, legal pages, 404, redirects, auth forms, reduced motion, dark mode. Needs only the app:
  ```bash
  npm run build && npx next start -p 3100 &
  npx playwright test tests/e2e/public.spec.ts
  ```
- `tests/e2e/app.spec.ts`: the full journey (waitlist confirm, signup, email verification, onboarding, quests, swap, shop, treehouse, progress, settings, logout, password reset, account deletion). Needs Supabase and access to auth emails via `E2E_MAIL_URL`. Without Docker, the repo includes a local stack that runs the real Supabase Auth server (GoTrue) plus a small test-only REST stand-in:
  ```bash
  GOTRUE_BIN=/path/to/gotrue npm run stack:up      # prints env vars
  # start the app with those vars + NEXT_PUBLIC_SITE_URL=http://localhost:3100
  npx next dev -p 3100 &
  E2E_MAIL_URL=http://localhost:54321/__mail npx playwright test tests/e2e/app.spec.ts
  npm run stack:down
  ```
  Build GoTrue from https://github.com/supabase/auth. The REST stand-in only covers what this app uses and is never used in production.

CI (`.github/workflows/tiny-wins.yml`) runs lint, typecheck, unit tests, database tests, a production build and the public E2E tests.

---

## Before launch checklist

- [ ] Supabase project created, migrations applied, email confirmation on
- [ ] Auth email templates replaced (`supabase/templates/`)
- [ ] Custom SMTP configured in Supabase
- [ ] Resend domain verified, `RESEND_API_KEY` + `WAITLIST_FROM_EMAIL` set
- [ ] All env vars set in Vercel; `NEXT_PUBLIC_SITE_URL` matches your domain
- [ ] `NEXT_PUBLIC_TIKTOK_URL` and `NEXT_PUBLIC_CONTACT_EMAIL` set
- [ ] Privacy policy and terms reviewed for your situation
- [ ] Official Pip art dropped into `public/pip/`
- [ ] (Optional) Turnstile keys, `SIGNUP_MODE=waitlist`

Not included on purpose: payments, subscriptions, social features, push notifications.
