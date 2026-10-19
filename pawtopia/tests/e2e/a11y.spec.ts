import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, newEmail, setLaunchMode, signInWithCode } from "./helpers";

// Audit the settled page (entrance animations briefly lower opacity, which skews contrast checks).
test.use({ contextOptions: { reducedMotion: "reduce" } });

async function audit(page: Page, label: string) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${label}: ${v.id} — ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`);
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
