import { expect, test } from "@playwright/test";
import { completeOnboarding, newEmail, setLaunchMode, signInWithCode } from "./helpers";

test("owner email in ADMIN_EMAILS becomes admin on first sign-in (no SQL needed)", async ({ page }) => {
  await page.goto("/auth?next=/admin");
  await signInWithCode(page, "owner-bootstrap@example.test");
  await page.waitForURL((url) => url.pathname === "/onboarding" || url.pathname === "/admin");
  if (page.url().includes("/onboarding")) await completeOnboarding(page, "Owner");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Creator dashboard" })).toBeVisible();
});

test("room shows the daily acorn bonus and a share button", async ({ page, context }) => {
  await setLaunchMode("open");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, newEmail("extras"));
  await completeOnboarding(page);
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);
  await expect(page.getByTestId("acorn-bonus")).toContainText("3 left");
  await page.getByTestId("care-snack").click();
  await expect(page.getByTestId("acorn-bonus")).toContainText("2 left");
  // Share: Web Share API isn't available in headless Chromium, so the link is copied instead.
  await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
  await page.getByTestId("share").click();
  await expect(page.getByText("Link copied")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/r/maple-flood-rescue?utm_source=share&utm_medium=player");
});

test("social preview images, app icons and the web manifest are served", async ({ request }) => {
  // Preview image URLs are read from each page's <meta og:image> (Next adds a hash to them).
  const ogFor = async (page: string) => {
    const html = await (await request.get(page)).text();
    const m = html.match(/<meta property="og:image" content="([^"]+)"/);
    expect(m, `og:image on ${page}`).not.toBeNull();
    return new URL(m![1].replaceAll("&amp;", "&")).pathname + new URL(m![1].replaceAll("&amp;", "&")).search;
  };
  const og = [await ogFor("/r/maple-flood-rescue"), await ogFor("/animals/maple"), await ogFor("/")];
  expect(og[0]).toContain("/r/maple-flood-rescue/opengraph-image");
  for (const path of [...og, "/apple-icon", "/app-icon/512"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain("image/png");
    expect((await res.body()).length, path).toBeGreaterThan(1000);
  }
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({ name: "Pawtopia", display: "standalone", start_url: "/app" });
});
