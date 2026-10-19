import { expect, test } from "@playwright/test";
import { completeOnboarding, newEmail, pool, setLaunchMode, signInWithCode } from "./helpers";

test.beforeAll(() => setLaunchMode("open"));

test("video link → Maple → sign up → adopt → care → gift → decorate → shop → persists", async ({ page, browser }) => {
  const email = newEmail("player");

  // 1. Campaign link shows Maple specifically, with disclosure and CTA.
  await page.goto("/r/maple-flood-rescue?utm_source=tiktok&utm_medium=video&utm_campaign=maple_launch&utm_content=vid_001");
  await expect(page.getByTestId("animal-name")).toHaveText("Maple");
  await expect(page.getByTestId("fiction-disclosure")).toContainText("Fictional AI-generated rescue story — Virtual adoption only");
  await page.getByTestId("adopt-cta").click();

  // 2. Passwordless sign-up returns to Maple's adoption screen via onboarding.
  await expect(page).toHaveURL(/\/auth\?next=%2Fanimals%2Fmaple%2Fadopt/);
  await signInWithCode(page, email);
  await completeOnboarding(page);
  await expect(page).toHaveURL(/\/animals\/maple\/adopt/);

  // 3. Adopt (double click is harmless).
  await page.getByTestId("confirm-adopt").dblclick();
  await expect(page).toHaveURL(/\/app\/animals\/[0-9a-f-]+\?welcome=1/);
  const roomUrl = page.url().split("?")[0];
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "50 acorns");

  // 4. First care: comfort, snack, play — real animations, server rewards.
  await page.getByTestId("care-comfort").click();
  await expect(page.getByTestId("pet")).toHaveAttribute("data-pet-state", "comforted");
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "55 acorns");
  await expect(page.getByTestId("pet")).toHaveAttribute("data-pet-state", "idle", { timeout: 5000 });
  await page.getByTestId("care-snack").click();
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "60 acorns");
  await expect(page.getByTestId("pet")).toHaveAttribute("data-pet-state", "idle", { timeout: 5000 });
  // Cooldown: comfort is disabled right after use.
  await expect(page.getByTestId("care-comfort")).toBeDisabled();
  await page.getByTestId("care-play").click();
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "65 acorns");
  await expect(page.getByTestId("bond-xp")).toHaveText("18 XP");

  // 5. Gift modal → place the blanket in the sanctuary.
  await page.getByTestId("gift-place").click();
  await expect(page).toHaveURL(/\/app\/sanctuary/);
  await page.getByTestId("toggle-decorate").click();
  await page.getByTestId("slot-small-1").click();
  await page.getByTestId("choose-soft-blanket").click();
  await expect(page.getByText(/Placed Soft Blanket/)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("placed-soft-blanket")).toBeVisible();

  // 6. Shop purchase with server-validated balance.
  await page.goto("/app/shop");
  await page.getByRole("button", { name: "Buy Wildflower Patch for 20 acorns" }).click();
  await expect(page.getByText("Wildflower Patch is yours!")).toBeVisible();
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "45 acorns");
  await page.reload();
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "45 acorns");
  await expect(page.getByTestId("shop-flower-patch")).toContainText("Owned");

  // 7. Refresh preserves XP and chapter state.
  await page.goto(roomUrl);
  await expect(page.getByTestId("bond-xp")).toHaveText("18 XP");
  await page.goto("/app/stories");
  await expect(page.getByRole("heading", { name: "A Warm, Dry Corner" })).toBeVisible();

  // 8. Attribution survived email verification.
  const { rows } = await pool.query(
    `select p.first_touch from public.profiles p join auth.users u on u.id = p.user_id where u.email = $1`, [email]);
  expect(rows[0].first_touch).toMatchObject({ source: "tiktok", campaign: "maple_launch", rescue_slug: "maple-flood-rescue" });

  // 9. Another player can't open this player's room or the admin.
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto("/auth");
  await signInWithCode(p2, newEmail("other"));
  await completeOnboarding(p2, "Alex");
  // The room streams a not-found page (soft 404 because of the loading skeleton) and leaks nothing.
  await p2.goto(roomUrl);
  await expect(p2.getByRole("heading", { name: "This trail leads nowhere" })).toBeVisible();
  await expect(p2.getByTestId("pet")).toHaveCount(0);
  await expect(p2.getByText("Sam")).toHaveCount(0);
  const admin = await p2.goto("/admin");
  expect(admin?.status()).toBe(404);
  await other.close();
});

test("magic link opened in a different browser still signs in", async ({ browser }) => {
  const email = newEmail("magic");
  const a = await browser.newContext();
  const pa = await a.newPage();
  await pa.goto("/auth");
  await pa.getByLabel("Email address").fill(email);
  await pa.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(pa.getByText("Sent to")).toBeVisible();
  const { waitForMail, extractLink } = await import("./helpers");
  const link = extractLink(await waitForMail(email), "/auth/confirm");
  const b = await browser.newContext();
  const pb = await b.newPage();
  await pb.goto(link);
  await expect(pb).toHaveURL(/\/onboarding/);
  await a.close();
  await b.close();
});

test("reduced motion and keyboard: care works without a mouse", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, newEmail("kb"));
  await completeOnboarding(page);
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);
  await page.getByTestId("care-snack").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "55 acorns");
  await expect(page.getByTestId("reaction")).not.toBeEmpty();
  await ctx.close();
});
