import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, newEmail, pool, setLaunchMode, signInWithCode } from "./helpers";

// Audit the settled page (entrance animations briefly lower opacity, which skews contrast checks).
test.use({ contextOptions: { reducedMotion: "reduce" } });

async function audit(page: Page, label: string) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map(
    (v) => `${label}: ${v.id} — ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

test("public pages have no serious accessibility violations", async ({ page }) => {
  await setLaunchMode("open");
  for (const path of ["/", "/r/maple-flood-rescue", "/animals/maple", "/auth", "/waitlist", "/privacy"]) {
    await page.goto(path);
    await audit(page, path);
  }
});

test("game screens have no serious accessibility violations", async ({ page }) => {
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, newEmail("a11y"));
  await expect(page).toHaveURL(/onboarding/);
  await audit(page, "/onboarding");
  await completeOnboarding(page);
  await audit(page, "/animals/maple/adopt");
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);
  await audit(page, "room");
  for (const path of ["/app", "/app/sanctuary", "/app/shop", "/app/stories", "/app/profile"]) {
    await page.goto(path);
    await audit(page, path);
  }
});

test("admin screens have no serious accessibility violations", async ({ page }) => {
  const email = newEmail("a11y-admin");
  await page.goto("/auth?next=/app");
  await signInWithCode(page, email);
  await completeOnboarding(page, "Auditor");
  await pool.query(
    `insert into public.app_roles (user_id, role, granted_by) select id, 'admin', 'e2e' from auth.users where email = $1`,
    [email],
  );
  for (const path of [
    "/admin",
    "/admin/animals",
    "/admin/animals/new",
    "/admin/rescues",
    "/admin/decor",
    "/admin/waitlist",
    "/admin/analytics",
  ]) {
    await page.goto(path);
    await audit(page, path);
  }
});
