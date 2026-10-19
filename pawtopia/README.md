# Pawtopia 🐾

**Every rescue deserves a new beginning.**

A mobile-first virtual animal sanctuary connected to fictional, AI-generated rescue videos.
A viewer taps a link in a TikTok / Instagram / Facebook post → lands on that exact animal's
rescue page → signs in with their email → virtually adopts the animal → cares for it
(comfort, snack, play, rest) → earns bond XP and acorns → unlocks recovery chapters →
decorates their sanctuary → comes back for each new rescue.

> Fictional AI-generated rescue stories — virtual adoption only. No real animals, no
> real money, no donations.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres,
Storage, RLS) · Vercel.

| Doc                                          | What's in it                                             |
| -------------------------------------------- | -------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | How it fits together, schema, security model, decisions  |
| [docs/deployment.md](docs/deployment.md)     | Supabase + Vercel setup, email, launch runbook           |
| [docs/assets.md](docs/assets.md)             | Replacing placeholder art with official character assets |
| [docs/acceptance.md](docs/acceptance.md)     | Acceptance checklist with actual test results            |
| [tests/README.md](tests/README.md)           | How the test suites run                                  |

## Quick start (local)

Requires Node 20.9+ and Docker (for the Supabase CLI).

```bash
cd pawtopia
npm install
npx supabase start          # local Postgres/Auth/Storage + Mailpit (http://127.0.0.1:54324)
npx supabase db reset       # applies supabase/migrations + supabase/seed.sql
cp .env.example .env.local  # fill in values printed by `npx supabase status`
npm run dev                 # http://localhost:3000
```

Then open http://localhost:3000/r/maple-flood-rescue?utm_source=instagram — sign-in
emails arrive in Mailpit locally.

### Make yourself an admin

Easiest: set `ADMIN_EMAILS=you@example.com` (server env var) and sign in — you become
admin automatically. Removing an email from the list later does not revoke the role
(delete it from `app_roles`). Alternatively, sign in once, then:

```bash
npm run admin:grant -- you@example.com          # or: ... you@example.com editor
```

(Or in the Supabase SQL editor:
`insert into app_roles (user_id, role) select id, 'admin' from auth.users where email = 'you@example.com';`)
Roles can't be granted from inside the app — by design.

## Environment variables

| Variable                                                     | Where            | Purpose                                                  |
| ------------------------------------------------------------ | ---------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                   | browser + server | Supabase project URL                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                              | browser + server | Anon / publishable key (RLS-protected)                   |
| `SUPABASE_SERVICE_ROLE_KEY`                                  | **server only**  | Waitlist tokens, account deletion, admin script          |
| `NEXT_PUBLIC_SITE_URL`                                       | both             | Canonical URL for emails and share links                 |
| `ADMIN_EMAILS`                                               | server           | Comma-separated emails auto-promoted to admin on sign-in |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | server           | Waitlist confirmation emails (optional)                  |

Without Supabase variables the app shows a setup screen instead of crashing.

## Scripts

|                                      |                                                                |
| ------------------------------------ | -------------------------------------------------------------- |
| `npm run dev` / `build` / `start`    | Next.js                                                        |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript                                            |
| `npm test`                           | Unit tests                                                     |
| `npm run test:db`                    | Database/RLS/economy integration tests (needs a running stack) |
| `npm run test:e2e`                   | Playwright end-to-end tests (needs app + stack + mailbox)      |
| `npm run admin:grant -- <email>`     | Grant admin/editor role                                        |

## Adding a new animal (no code changes)

1. `/admin/animals/new` — name, species, slug, bio, markings, habitat → **Create draft**.
2. On the animal page: upload art per animation state (idle, happy, comforted, snacking,
   playing, resting, avatar, cover, poster, teaser). Missing states fall back to the
   labelled placeholder art.
3. Add recovery chapters (title, text, unlock XP).
4. **+ Rescue episode** — title, slug (`/r/<slug>`), synopsis, video URLs.
5. **Preview**, then **Publish episode + animal** (publishes both in one transaction).
6. Copy the TikTok / Instagram / Facebook links from **Share links** into your posts.
7. Watch `/admin/analytics` for views → sign-ups → adoptions → first care per video.

Archiving an animal or episode never removes existing players' adoptions.
