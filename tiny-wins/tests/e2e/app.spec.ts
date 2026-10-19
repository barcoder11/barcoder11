import { expect, test, type Page } from "@playwright/test";

/**
 * Full user journey against a real Supabase Auth server.
 * Needs E2E_MAIL_URL: an endpoint returning captured emails as
 * [{ body }] for ?to=<address> (the local test stack provides one).
 */
const MAIL_URL = process.env.E2E_MAIL_URL;
test.skip(!MAIL_URL, "Set E2E_MAIL_URL (and run against a Supabase-backed server) to run the full journey.");
test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);
const email = `pip-fan-${stamp}@example.com`;
const password = "acorns4ever";
const newPassword = "treehouse99";

async function latestLink(to: string, contains: string, after = 0): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAIL_URL}?to=${encodeURIComponent(to)}`);
    const msgs = (await res.json()) as { at: number; body: string }[];
    const fresh = msgs.filter((m) => m.at > after);
    for (const m of fresh.reverse()) {
      const match = m.body.match(/href="([^"]+)"/g)?.map((h) => h.slice(6, -1).replaceAll("&amp;", "&")).find((h) => h.includes(contains));
      if (match) return match;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email for ${to} containing ${contains}`);
}

async function acorns(page: Page): Promise<number> {
  const label = await page.getByRole("link", { name: /acorns$/ }).first().getAttribute("aria-label");
  return Number(label?.match(/(\d+)/)?.[1] ?? NaN);
}

test("waitlist: join, confirm, and handle duplicates", async ({ page }) => {
  const fan = `waitlist-${stamp}@example.com`;
  await page.goto("/?utm_source=tiktok");
  const form = page.locator("#hero-join");
  await page.waitForTimeout(1600); // humans take a moment; instant submits are treated as bots
  await form.getByLabel("Email address").fill(fan);
  await form.getByRole("button", { name: "Get early access" }).click();
  await expect(form.getByText("Almost there! Check your inbox.")).toBeVisible();

  // Dev mode shows the confirmation link because no email provider is configured.
  const link = await form.getByRole("link", { name: /waitlist\/confirm/ }).getAttribute("href");
  expect(link).toBeTruthy();
  await page.goto(link!);
  await page.getByRole("button", { name: "Confirm my spot" }).click();
  await expect(page.getByRole("heading", { name: /You're in!/ })).toBeVisible();
  await expect(page.getByText(/Treehouse spot #\d+/)).toBeVisible();

  // Joining again with the same email (any casing) is recognized.
  await page.goto("/");
  await page.waitForTimeout(1600);
  await page.locator("#hero-join").getByLabel("Email address").fill(fan.toUpperCase());
  await page.locator("#hero-join").getByRole("button", { name: "Get early access" }).click();
  await expect(page.getByText("You're already on the list!")).toBeVisible();
});

test("signup requires email verification, then onboarding", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(email)).toBeVisible();

  // Can't log in before verifying.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Please confirm your email first")).toBeVisible();

  // Verify via the emailed link.
  const link = await latestLink(email, "/verify");
  await page.goto(link);
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByRole("button", { name: "Let's go!" }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: /Fitness/ }).click();
  await page.getByRole("checkbox", { name: /Studying/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Mornings/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Tiny steps/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Your plan")).toBeVisible();
  await page.getByRole("button", { name: "Start my first quests" }).click();

  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sam");
});

async function login(page: Page, pw = password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/home/);
}

test("quests award XP and acorns once, and progress persists", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("button", { name: /^Complete:/ })).toHaveCount(3);
  const before = await acorns(page);
  expect(before).toBe(0);

  await page.getByRole("button", { name: /^Complete:/ }).first().click();
  await expect(page.getByText(/^\+\d+ XP/)).toBeVisible();
  await expect(page.getByText("Achievement unlocked: First Tiny Win")).toBeVisible();
  await expect.poll(() => acorns(page)).toBeGreaterThan(0);
  const afterOne = await acorns(page);

  // Refresh: still completed, same balance.
  await page.reload();
  await expect(page.getByRole("button", { name: /^Complete:/ })).toHaveCount(2);
  expect(await acorns(page)).toBe(afterOne);

  // Swap one on the quests page, then finish the rest.
  await page.goto("/quests");
  const titlesBefore = await page.locator("article h3").allTextContents();
  await page.getByRole("button", { name: "Swap" }).first().click();
  await expect(page.getByText("You've used today's swap.")).toBeVisible();
  const titlesAfter = await page.locator("article h3").allTextContents();
  expect(titlesAfter).not.toEqual(titlesBefore);
  await expect(page.getByRole("button", { name: "Swap" })).toHaveCount(0);

  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /^Complete:/ }).first().click();
    await expect(page.getByRole("button", { name: /^Complete:/ })).toHaveCount(1 - i);
  }
  await expect(page.getByText("All three done!")).toBeVisible();
  await page.reload();
  await expect(page.getByText("All three done!")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Complete:/ })).toHaveCount(0);
});

test("shop purchase deducts acorns and decorates the treehouse", async ({ page }) => {
  await login(page);
  const start = await acorns(page);
  expect(start).toBeGreaterThanOrEqual(20);

  await page.goto("/shop");
  await page.getByRole("button", { name: /^Round Rug, 20 acorns/ }).click();
  await page.getByRole("button", { name: /Buy for/ }).click();
  await expect(page.getByText("Round Rug is yours!")).toBeVisible();
  // -20 for the rug, +10 for the "Home Sweet Home" achievement
  await expect.poll(() => acorns(page)).toBe(start - 20 + 10);
  await expect(page.getByRole("button", { name: "Round Rug, owned" })).toBeVisible();

  // Locked items can't be bought.
  await page.getByRole("button", { name: /Bonsai Tree, unlocks at level 5/ }).click();
  await expect(page.getByText("Reach level 5 to unlock this")).toBeVisible();
  await page.keyboard.press("Escape");

  // It's placed in the treehouse; move it out and back, then refresh.
  await page.goto("/treehouse");
  const rug = page.locator('[data-item="round-rug"]');
  await expect(rug).toHaveCount(1);
  await page.getByRole("button", { name: "Decorate" }).click();
  await page.getByRole("button", { name: "Change Rug" }).click();
  await page.getByRole("button", { name: "Leave empty" }).click();
  await expect(rug).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-item="round-rug"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Decorate" }).click();
  await page.getByRole("button", { name: "Change Rug" }).click();
  await page.getByRole("button", { name: /Round Rug/ }).click();
  await expect(page.locator('[data-item="round-rug"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-item="round-rug"]')).toHaveCount(1);
});

test("progress page shows achievements and history", async ({ page }) => {
  await login(page);
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await expect(page.getByText("Unlocked", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Quest completed").first()).toBeVisible();
  await expect(page.getByText("Bought a decoration")).toBeVisible();
});

test("settings save, theme toggles, logout works", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await page.getByLabel("Name").fill("Samantha");
  await page.getByRole("checkbox", { name: /Kindness/ }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Saved!/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Samantha");
  await expect(page.getByRole("checkbox", { name: /Kindness/ })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.getByRole("switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await page.getByRole("switch").click();

  await page.getByRole("main").getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});

test("password reset by email", async ({ page }) => {
  const sentAfter = Date.now();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("a reset link is on its way")).toBeVisible();
  const link = await latestLink(email, "/verify", sentAfter);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password/);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/home/);
});

test("account deletion removes the user", async ({ page }) => {
  await login(page, newPassword);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Type DELETE").fill("nope");
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page.getByText("Type DELETE to confirm.")).toBeVisible();
  await page.getByLabel("Type DELETE").fill("DELETE");
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page).toHaveURL(/\/\?account=deleted/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("don't match")).toBeVisible();
});
