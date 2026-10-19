import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests.
 *   public.spec.ts  – marketing site, auth pages, redirects. Needs only the app.
 *   app.spec.ts     – the full journey (waitlist, signup, email confirm,
 *                     onboarding, quests, shop, treehouse, settings, delete).
 *                     Needs Supabase + a way to read auth emails, so it only
 *                     runs when E2E_MAIL_URL is set (see README).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /public\.spec\.ts/ },
  ],
});
