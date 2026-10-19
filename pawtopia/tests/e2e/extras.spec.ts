import { expect, test } from "@playwright/test";
import { completeOnboarding, newEmail, pool, setLaunchMode, signInWithCode } from "./helpers";

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

test("landing visits are recorded through the server; the maintenance job requires its secret", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/r/maple-flood-rescue?utm_source=facebook&utm_campaign=e2e_track");
  await expect(page.getByTestId("animal-name")).toHaveText("Maple");
  const visitor = (await context.cookies()).find((c) => c.name === "pt_aid")?.value;
  expect(visitor).toBeTruthy();
  await expect
    .poll(async () => {
      const { rows } = await pool.query(
        `select count(*)::int n from public.attribution_events
          where anonymous_id = $1 and event_type = 'rescue_landing_viewed' and source = 'facebook' and campaign = 'e2e_track'`,
        [visitor],
      );
      return rows[0].n;
    })
    .toBe(1);

  expect((await request.get("/api/cron/maintenance")).status()).toBe(401);
  expect((await request.get("/api/cron/maintenance", { headers: { authorization: "Bearer wrong" } })).status()).toBe(
    401,
  );
  const ok = await request.get("/api/cron/maintenance", {
    headers: { authorization: `Bearer ${process.env.E2E_CRON_SECRET ?? "local-cron-secret"}` },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ ok: true });
});

test("chapter unlock popup is an accessible dialog that Escape closes", async ({ page }) => {
  await setLaunchMode("open");
  const email = newEmail("dialog");
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, email);
  await completeOnboarding(page);
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);
  // Put Maple just below the 25 XP threshold for chapter 2.
  await pool.query(
    `update public.user_animals ua set bond_xp = 22 from auth.users u where u.id = ua.user_id and u.email = $1`,
    [email],
  );
  await page.reload();
  await page.getByTestId("care-comfort").click();
  const dialog = page.getByRole("dialog", { name: /Chapter 2: The First Sniff/ });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  await expect(dialog.getByRole("button", { name: "Keep playing" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("a quick second tap never swallows a pending chapter popup", async ({ page }) => {
  await setLaunchMode("open");
  const email = newEmail("queue");
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, email);
  await completeOnboarding(page);
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);
  await pool.query(
    `update public.user_animals ua set bond_xp = 22 from auth.users u where u.id = ua.user_id and u.email = $1`,
    [email],
  );
  await page.reload();
  await page.getByTestId("care-comfort").click(); // unlocks chapter 2
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "55 acorns");
  await page.getByTestId("care-snack").click(); // before the first popup had a chance to open
  await expect(page.getByRole("dialog", { name: /Chapter 2: The First Sniff/ })).toBeVisible({ timeout: 8000 });
});

test("strict Content-Security-Policy: nonce'd scripts run, nothing is blocked", async ({ page, request }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply|connect)/i.test(msg.text()))
      violations.push(msg.text());
  });
  const res = await request.get("/r/maple-flood-rescue");
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");

  await setLaunchMode("open");
  for (const path of ["/", "/r/maple-flood-rescue?utm_source=tiktok", "/animals/maple", "/waitlist", "/no-such-page"]) {
    await page.goto(path);
  }
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, newEmail("csp")); // browser → Supabase auth (connect-src)
  await completeOnboarding(page);
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);
  await page.getByTestId("care-play").click(); // hydrated client code + server action
  await expect(page.getByTestId("acorn-balance")).toHaveAttribute("aria-label", "55 acorns");
  for (const path of ["/app", "/app/sanctuary", "/app/shop", "/app/stories", "/app/profile"]) {
    await page.goto(path);
  }
  expect(violations).toEqual([]);
});

test("sitemap lists published rescues; new arrivals get a badge", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/r/maple-flood-rescue</loc>");
  expect(sitemap).toContain("/animals/maple</loc>");
  expect(sitemap).not.toContain("/animals/pebble</loc>"); // coming soon, not published
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
  await pool.query(`update public.animals set published_at = now() - interval '2 days' where slug = 'maple'`);
  await page.goto("/");
  await expect(page.getByTestId("new-badge").first()).toBeVisible();
});
