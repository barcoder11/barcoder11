# Acceptance checklist — actual results

Run on 2026-10-19 in a sandbox against a real Supabase-compatible stack built from
source (Postgres 16, Supabase Auth/GoTrue, PostgREST, Supabase Storage API, local SMTP
catcher — see `tests/local-stack`). **Not yet run against a hosted Supabase project or
Vercel** (no credentials were available).

| Suite | Result |
|---|---|
| ESLint | ✅ clean |
| TypeScript (`tsc --noEmit`) | ✅ clean |
| `next build` (production) | ✅ success |
| Migrations + seed on clean database | ✅ applied |
| Unit tests (`src/**/*.test.ts`) | ✅ 22 / 22 |
| DB integration tests (`tests/db`, real API + RLS + storage) | ✅ 30 / 30 |
| Playwright E2E (`tests/e2e`, 360 px phone viewport) | ✅ 6 / 6 |

## PRD §18 definition of done

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | `/r/maple-flood-rescue` shows Maple, story, disclosure, CTA | ✅ | e2e core-loop; db "public catalog" |
| 2 | Waitlist mode blocks play; verified email persists once; neutral duplicates | ✅ | e2e waitlist; db waitlist |
| 3 | Sign-in returns visitor to Maple after verification | ✅ same browser · ⚠️ cross-device | e2e core-loop (code); token-hash link works in another browser (e2e) but lands on onboarding → `/app`, not Maple, because the return path lives in a cookie |
| 4 | Exactly one adoption + one welcome gift under double taps | ✅ | db: 4 concurrent adopt calls → 1 row, 50 acorns; e2e double-click |
| 5 | Two users adopt Maple independently, no cross-account exposure | ✅ | db two-player test; e2e second player gets not-found on first player's room |
| 6 | Care runs animations, stores actions; refresh keeps XP/coins/inventory/chapters | ✅ | e2e core-loop (reload checks) |
| 7 | Tampered amounts / duplicate keys never double-reward | ✅ | db: direct wallet/XP/ledger writes rejected, `_credit` not callable, concurrent replays |
| 8 | Insufficient funds fails safely; concurrent buys never overdraw/duplicate | ✅ | db concurrent purchase tests (ledger == wallet) |
| 9 | Ordinary users can't reach admin, private data, or self-promote | ✅ | db admin protection + storage upload denial; e2e `/admin` → 404 |
| 10 | Admin creates draft, uploads asset, previews, publishes, copies links; archive keeps adoptions | ✅ | e2e admin (real upload to Storage); db archive test |
| 11 | 360 px, large screens, keyboard, reduced motion, empty/error states | ✅ mostly | e2e at 360 px + keyboard + reduced motion; desktop checked by screenshots; no automated axe audit yet; no offline mode (error boundary only) |
| 12 | No placeholder CTAs, no mock DB | ✅ | all actions hit Supabase; placeholder *art* is labelled |
| 13 | Lint/build/migrations/tests in clean env; external setup documented | ✅ local · ⏳ hosted | see docs/deployment.md |
| 14 | Consent, unsubscribe/delete, auth recovery, rate limits | ✅ mostly | e2e export + account deletion; waitlist unsubscribe/delete + resend limits (db); terms/age consent enforced in DB; auth email rate limits are Supabase settings (not tested here) |
| 15 | Funnel events without excessive duplication | ✅ | db: landing view dedupe, anonymous→user linking, first-care once |

## Manual checks still needed on real infrastructure

- Sign-in email delivery from the hosted Supabase project (and custom SMTP).
- Full flow on real phones from inside the Instagram, TikTok and Facebook apps.
- Vercel deployment, domain, and `Cache-Control` behaviour behind Vercel's CDN.
