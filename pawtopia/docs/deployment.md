# Deployment & launch runbook

## 1. Supabase project

1. Create a project at supabase.com. The easiest way to wire it to Vercel is
   **Vercel → Project → Storage → Connect Database → Supabase**, which creates the project
   and sets the Supabase environment variables for you.
   - **Region: pick the same region as your Vercel Functions** — East US (North Virginia)
     matches Vercel's default (`iad1`). Every page makes a few database calls in sequence;
     in the same region each takes a few milliseconds, across an ocean ~80–100 ms each.
     If you choose another Supabase region, set **Vercel → Project → Settings → Functions →
     Region** to the matching one.
   - **Auth → JWT Keys:** keep the default asymmetric signing keys (new projects use them).
     The app then verifies sessions locally with cached public keys; with the legacy shared
     JWT secret, every session check becomes a network call to Supabase Auth.
2. Apply the database — easiest: open **SQL Editor → New query**, paste the whole of
   `supabase/setup.sql` (all migrations + seed in one file) and click **Run**. Or with the CLI:
   ```bash
   cd pawtopia
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npx supabase db push                        # migrations
   psql "$DATABASE_URL" -f supabase/seed.sql   # or paste seed.sql into the SQL editor
   ```
3. **Auth → URL configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/**` (plus your `*.vercel.app` preview URL if wanted)
4. **Auth → Email templates** — paste `supabase/templates/magic_link.html` into _Magic
   Link_ and `supabase/templates/confirmation.html` into _Confirm signup_. Both contain
   the token-hash link (`/auth/confirm?...`) **and** the 6-digit code, which work across
   browsers. The default templates also work (PKCE link via `/auth/callback`) but fail when
   the link opens in a different browser than the one that requested it.
5. **Auth → SMTP** — Supabase's built-in email is heavily rate-limited (a few per hour)
   and meant for testing. Before launch, configure custom SMTP (Resend, Postmark, SES…)
   and set _Auth → Rate limits_ appropriately. Sign-in requests come from each player's
   browser, so the limits apply per player IP, not to your whole site.
6. Turn on MFA for your own Supabase dashboard account (admin protection).

### Upgrading a database set up from an older `setup.sql`

Run any migration in `supabase/migrations/` that your database doesn't have yet, in
filename order, in the SQL editor (or `npx supabase db push`). The three added on
2026-10-20 — `20261020000100_abuse_protection.sql`, `20261020000200_admin_tools.sql` and
`20261020000300_catalog_version.sql` — are safe to run more than once.

## 2. Vercel

1. Import the GitHub repo in Vercel. **Root Directory: `pawtopia`**. Framework: Next.js.
   Node.js 22 is selected automatically from `package.json` (`engines`).
2. Environment variables (Production + Preview) — see `.env.example`:

   | Variable                        | Required | Notes                                                            |
   | ------------------------------- | -------- | ---------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | yes      | Set by the Vercel ↔ Supabase integration                         |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Anon or publishable key                                          |
   | `SUPABASE_SERVICE_ROLE_KEY`     | yes      | **Never** prefix with `NEXT_PUBLIC_`                             |
   | `NEXT_PUBLIC_SITE_URL`          | yes      | `https://your-domain.com`, no trailing slash                     |
   | `CRON_SECRET`                   | yes      | Long random string; protects the daily retention job (see below) |
   | `ADMIN_EMAILS`                  | yes      | Your email; becomes admin on first sign-in                       |
   | `SMTP_*`, `EMAIL_FROM`          | optional | Waitlist confirmation emails                                     |

3. Deploy, then add your domain and update `NEXT_PUBLIC_SITE_URL` + Supabase Site URL.
4. **Redeploy after changing any environment variable** (Deployments → latest → ⋯ →
   Redeploy). Settings are read when the site is built: the `NEXT_PUBLIC_*` values are
   compiled into the pages, and the Supabase URL also tells the image optimizer which
   host to accept. Connecting Supabase to the already-deployed project takes effect only
   after a redeploy.

Uploaded art goes through Vercel's image optimizer, which has a monthly allowance on every
plan. Each animal has a few images and each resized copy is cached for 31 days, so usage
stays small; **Vercel → Usage → Image Optimization** shows it.

### Daily retention job

`vercel.json` schedules `GET /api/cron/maintenance` daily at 04:17 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set; without it
the route refuses every request. The job deletes stale rate-limit counters, unconfirmed
waitlist sign-ups older than 30 days and anonymous analytics older than 180 days. Check
**Vercel → Project → Cron Jobs** for its run history.

## 3. Waitlist email (optional)

Set `SMTP_*` and `EMAIL_FROM` (same provider as Supabase SMTP is fine). Without them,
waitlist sign-ups are stored but unconfirmed, and the form says so honestly.

## 4. Admin bootstrap

Set `ADMIN_EMAILS` on Vercel to your email and sign in — you become admin on that
sign-in. Or sign in on the live site once, then `npm run admin:grant -- you@example.com` with the
production env in `.env.local`, or run the SQL in the README.

## 5. Launch checklist

- [ ] `/admin` → Launch mode: start in **Waitlist**, switch to **Open beta** at launch.
- [ ] Upload official Maple art for idle/happy/comforted/snacking/playing/resting + poster/teaser.
- [ ] Add the real TikTok/Instagram/Facebook post URLs to the Maple episode.
- [ ] Copy share links from `/admin/rescues/<id>` into posts / bio.
- [ ] Test a full sign-up on a phone from inside the Instagram and TikTok apps.
- [ ] Legal review of `/privacy` and `/terms` (currently marked DRAFT), age policy, and
      the "Pawtopia" name/trademark clearance.
- [ ] Custom SMTP configured; send yourself a sign-in code and a waitlist email.
- [ ] `CRON_SECRET` set and the first maintenance run shows as successful.
- [ ] Supabase backups enabled (Pro plan) and Vercel firewall/rate limiting reviewed.
- [ ] Vercel deployment protection turned off for Production only when you're ready to go public.

## Releasing a new rescue animal

Follow "Adding a new animal" in the README — no deploy needed.
