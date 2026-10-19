import { defineConfig, devices } from "@playwright/test";

// E2E runs against a running app (npm run build && npm start) connected to a
// Supabase-compatible stack with a capturable mailbox (see tests/README.md).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } }],
});
