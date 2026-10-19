# Acceptance checklist — actual results

Last run on 2026-10-19, in two independent environments:

- **GitHub Actions** (`.github/workflows/pawtopia-ci.yml`) against the official local
  Supabase stack (`supabase start`: Postgres 17, Auth, PostgREST, Storage, Mailpit).
- **Sandbox** against a Supabase-compatible stack built from source (Postgres 16, GoTrue,
  PostgREST, Storage API, local SMTP catcher — see `tests/local-stack`).

Deployed to Vercel (`pawtopia-nu.vercel.app`); **not yet run against a hosted Supabase
project** (none connected yet).

| Suite                                                                  | Result                        |
| ---------------------------------------------------------------------- | ----------------------------- |
| Prettier · ESLint · TypeScript (`tsc --noEmit`)                        | ✅ clean                      |
| knip (unused files, exports, dependencies)                             | ✅ clean                      |
| `next build` (production, with and without Supabase configured)        | ✅ success                    |
| Migrations + seed on a clean database · `setup.sql` matches migrations | ✅ applied · ✅ in sync       |
| `npm audit --omit=dev` (production dependencies)                       | ✅ 0 vulnerabilities          |
| Unit tests (`src/**/*.test.ts`)                                        | ✅ 37 / 37                    |
| DB integration tests (`tests/db`, real API + RLS + Storage)            | ✅ 44 / 44                    |
| Playwright E2E (`tests/e2e`, 360 px phone viewport)                    | ✅ 18 / 18                    |
| Automated WCAG 2.2 AA audit (axe) on 21 public, game and admin screens | ✅ no serious/critical issues |
| Strict Content-Security-Policy (E2E listens for violations)            | ✅ none                       |

## PRD §18 definition of done

| #   | Requirement                                                                                    | Status            | Evidence                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `/r/maple-flood-rescue` shows Maple, story, disclosure, CTA                                    | ✅                | e2e core-loop; db "public catalog"                                                                                                                                                                                                         |
| 2   | Waitlist mode blocks play; verified email persists once; neutral duplicates                    | ✅                | e2e waitlist; db waitlist                                                                                                                                                                                                                  |
| 3   | Sign-in returns visitor to Maple after verification                                            | ✅                | e2e: same browser (code) and a link opened in a _different_ browser both return a new player to Maple with first-touch attribution (saved in sign-up metadata). Existing players opening a link on another device land on their dashboard. |
| 4   | Exactly one adoption + one welcome gift under double taps                                      | ✅                | db: 4 concurrent adopt calls → 1 row, 50 acorns; e2e double-click                                                                                                                                                                          |
| 5   | Two users adopt Maple independently, no cross-account exposure                                 | ✅                | db two-player test; e2e second player gets not-found on first player's room                                                                                                                                                                |
| 6   | Care runs animations, stores actions; refresh keeps XP/coins/inventory/chapters                | ✅                | e2e core-loop (reload checks)                                                                                                                                                                                                              |
| 7   | Tampered amounts / duplicate keys never double-reward                                          | ✅                | db: direct wallet/XP/ledger writes rejected, `_credit` not callable, concurrent replays                                                                                                                                                    |
| 8   | Insufficient funds fails safely; concurrent buys never overdraw/duplicate                      | ✅                | db concurrent purchase tests (ledger == wallet)                                                                                                                                                                                            |
| 9   | Ordinary users can't reach admin, private data, or self-promote                                | ✅                | db admin protection + storage upload denial; e2e `/admin` → 404                                                                                                                                                                            |
| 10  | Admin creates draft, uploads asset, previews, publishes, copies links; archive keeps adoptions | ✅                | e2e admin (real upload to Storage); db archive test                                                                                                                                                                                        |
| 11  | 360 px, large screens, keyboard, reduced motion, empty/error states                            | ✅                | e2e at 360 px + keyboard + reduced motion; axe audit on 21 screens; desktop checked by screenshots; dropped connections show a retry message (no offline play)                                                                             |
| 12  | No placeholder CTAs, no mock DB                                                                | ✅                | all actions hit Supabase; placeholder _art_ is labelled                                                                                                                                                                                    |
| 13  | Lint/build/migrations/tests in clean env; external setup documented                            | ✅ CI · ⏳ hosted | CI runs everything on a fresh stack per push; hosted steps in docs/deployment.md                                                                                                                                                           |
| 14  | Consent, unsubscribe/delete, auth recovery, rate limits                                        | ✅ mostly         | e2e export + account deletion; waitlist unsubscribe/delete + resend and per-client limits (db); analytics flood limit (db); terms/age consent enforced in DB; auth email rate limits are Supabase settings (not tested here)               |
| 15  | Funnel events without excessive duplication                                                    | ✅                | db: landing view dedupe, anonymous→user linking, first-care once                                                                                                                                                                           |

## Manual checks still needed on real infrastructure

- Sign-in email delivery from the hosted Supabase project (and custom SMTP).
- Full flow on real phones from inside the Instagram, TikTok and Facebook apps.
- Vercel deployment, domain, and `Cache-Control` behaviour behind Vercel's CDN.

## Added after the first pass

- Social preview cards (Open Graph images) for rescue, animal and home pages.
- "Share" button in the animal room (Web Share API, copy-link fallback; links tagged `utm_source=share`).
- Daily acorn bonus indicator (3 dots, resets at the player's local midnight).
- Installable web app: manifest + home-screen icons.
- `ADMIN_EMAILS` admin bootstrap; cross-device return path + attribution for new players.
- Accessibility fixes found by axe: decorative SVGs hidden from screen readers, keyboard-reachable
  phase list, terracotta text darkened to `#965337` (PRD `#A86548` was 4.3:1 on cream, below AA).

## Hardening pass

- Sign-in requests moved to the browser so Supabase's per-IP limits apply per player; email
  links show a "Sign in" button so link-scanning bots can't use up the token.
- Server-only analytics and waitlist writes with per-client rate limits; daily retention job.
- Admin decoration manager, waitlist page, consented contact exports (audited, CSV-injection safe).
- Nonce-based Content-Security-Policy, sitemap, "New rescue" badge.
- Fixed: uploaded art now animates like the placeholder art; a quick second tap no longer
  swallows a chapter popup; forms recover from dropped connections; dialogs are accessible.
- Engineering: Prettier, knip, structured logging without personal data, a database
  function allow-list test, timezone and data-export isolation tests, and CI on every push.
