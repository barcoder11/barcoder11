# Deployment & launch runbook

## 1. Supabase project

1. Create a project at supabase.com (pick a region near your players).
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
4. **Auth → Email templates** — paste `supabase/templates/magic_link.html` into both
   *Magic Link* and *Confirm signup*. They include the token-hash link
   (`/auth/confirm?...`) **and** the 6-digit code, which both work across browsers.
   The default templates also work (PKCE link via `/auth/callback`) but fail when the
   link opens in a different browser than the one that requested it.
5. **Auth → SMTP** — Supabase's built-in email is heavily rate-limited (a few per hour)
   and meant for testing. Before launch, configure custom SMTP (Resend, Postmark, SES…)
   and set *Auth → Rate limits* appropriately.
6. Turn on MFA for your own Supabase dashboard account (admin protection).

## 2. Vercel

1. Import the GitHub repo in Vercel. **Root Directory: `pawtopia`**. Framework: Next.js.
2. Environment variables (Production + Preview): see `.env.example`.
   `SUPABASE_SERVICE_ROLE_KEY` must **not** be prefixed with `NEXT_PUBLIC_`.
3. Deploy, then add your domain and update `NEXT_PUBLIC_SITE_URL` + Supabase Site URL.

## 3. Waitlist email (optional)

Set `SMTP_*` and `EMAIL_FROM` (same provider as Supabase SMTP is fine). Without them,
waitlist sign-ups are stored but unconfirmed, and the form says so honestly.

## 4. Admin bootstrap

Sign in on the live site once, then `npm run admin:grant -- you@example.com` with the
production env in `.env.local`, or run the SQL in the README.

## 5. Launch checklist

- [ ] `/admin` → Launch mode: start in **Waitlist**, switch to **Open beta** at launch.
- [ ] Upload official Maple art for idle/happy/comforted/snacking/playing/resting + poster/teaser.
- [ ] Add the real TikTok/Instagram/Facebook post URLs to the Maple episode.
- [ ] Copy share links from `/admin/rescues/<id>` into posts / bio.
- [ ] Test a full sign-up on a phone from inside the Instagram and TikTok apps.
- [ ] Legal review of `/privacy` and `/terms` (currently marked DRAFT), age policy, and
      the "Pawtopia" name/trademark clearance.
- [ ] Custom SMTP configured; send yourself a magic link and a waitlist email.
- [ ] Supabase backups enabled (Pro plan) and Vercel firewall/rate limiting reviewed.

## Releasing a new rescue animal

Follow "Adding a new animal" in the README — no deploy needed.
