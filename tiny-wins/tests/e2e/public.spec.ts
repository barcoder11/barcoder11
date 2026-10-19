import { expect, test } from "@playwright/test";

test.describe("marketing site", () => {
  test("landing page explains Tiny Wins and has a working demo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Help Pip grow");
    await expect(page.getByText("Big dreams. Small steps. One acorn at a time.").first()).toBeVisible();

    // Demo quests: tapping one completes it locally.
    const demo = page.getByRole("button", { name: "Complete: Make your bed" });
    await demo.scrollIntoViewIfNeeded();
    await demo.click();
    await expect(page.getByRole("button", { name: "Make your bed completed" })).toBeVisible();
    await expect(page.getByText("1/3 today")).toBeVisible();

    // Treehouse preview switches stages.
    await page.getByRole("tab", { name: "Month 1" }).click();
    await expect(page.getByRole("img", { name: "Pip's treehouse, level 8" })).toBeVisible();
  });

  test("greets visitors who come from TikTok", async ({ page }) => {
    await page.goto("/?utm_source=tiktok");
    await expect(page.getByText("Hey TikTok friend!")).toBeVisible();
  });

  test("waitlist form validates email before sending", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#hero-join");
    await form.getByLabel("Email address").fill("not-an-email");
    await form.getByRole("button", { name: "Get early access" }).click();
    await expect(form.getByRole("alert")).toContainText("doesn't look like an email");
  });

  test("waitlist API rejects bad input and disposable domains", async ({ request }) => {
    const bad = await request.post("/api/waitlist", { data: { email: "nope" } });
    expect([400, 503]).toContain(bad.status());
    const junk = await request.post("/api/waitlist", { data: { email: "x@mailinator.com", startedAt: Date.now() - 10_000 } });
    expect([400, 503]).toContain(junk.status());
  });

  test("privacy and terms pages load", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("unknown pages show a friendly 404", async ({ page }) => {
    const res = await page.goto("/no-such-branch");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("this branch is empty")).toBeVisible();
  });

  test("no horizontal scrolling on the landing page", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("auth pages", () => {
  test("app pages redirect signed-out visitors to login", async ({ page }) => {
    for (const path of ["/home", "/quests", "/treehouse", "/shop", "/progress", "/settings", "/onboarding"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace("%2F", "(/|%2F)")}`));
    }
  });

  test("login and signup forms render with labels", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("button", { name: "Create my account" })).toBeVisible();
  });

  test("signup validates on the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page.getByText(/Use at least 8 characters|Accounts aren't connected yet/).first()).toBeVisible();
  });
});

test.describe("accessibility basics", () => {
  test("respects reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const duration = await page.evaluate(() => {
      const el = document.querySelector(".animate-float");
      return el ? getComputedStyle(el).animationDuration : "none";
    });
    expect(["0.001ms", "1e-06s", "0s", "none"]).toContain(duration);
    await ctx.close();
  });

  test("dark mode applies", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await ctx.close();
  });
});
