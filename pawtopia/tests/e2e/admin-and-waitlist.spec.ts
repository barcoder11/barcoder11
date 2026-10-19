import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { completeOnboarding, extractLink, newEmail, pool, setLaunchMode, signInWithCode, waitForMail } from "./helpers";

test.afterAll(() => setLaunchMode("open"));

test("admin publishes a brand-new animal + rescue and gets share links, without code", async ({ page, browser }) => {
  await setLaunchMode("open");
  const email = newEmail("admin");
  await page.goto("/auth");
  await signInWithCode(page, email);
  await completeOnboarding(page, "Creator");
  await pool.query(
    `insert into public.app_roles (user_id, role, granted_by) select id, 'admin', 'e2e' from auth.users where email = $1`, [email]);

  const slug = `hazel-${Date.now().toString(36)}`;
  await page.goto("/admin/animals/new");
  await page.getByLabel("Name *").fill("Hazel");
  await page.getByLabel("Species *").fill("Hedgehog");
  await page.getByLabel(/Slug \*/).fill(slug);
  await page.getByLabel("Bio (required to publish)").fill("A gentle hedgehog who loves leaf piles.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created!")).toBeVisible();

  // Upload a real PNG to Supabase Storage.
  const png = path.join(os.tmpdir(), `hazel-${Date.now()}.png`);
  fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  await page.getByTestId("asset-file").setInputFiles(png);
  await page.getByLabel("Alt text *").fill("Hazel the hedgehog curled in leaves");
  await page.getByRole("button", { name: "Upload asset" }).click();
  await expect(page.getByText("Asset uploaded and now live")).toBeVisible();

  // Draft is invisible to the public.
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  expect((await ap.goto(`/animals/${slug}`))?.status()).toBe(404);

  // Create & publish the rescue episode.
  await page.getByRole("link", { name: "+ Rescue episode" }).click();
  await page.getByLabel("Title *").fill("Hazel and the Hedge");
  await page.getByLabel(/Slug \* \(link path/).fill(`${slug}-hedge-rescue`);
  await page.getByLabel("Instagram post URL").fill("https://www.instagram.com/reel/abc123/");
  await page.getByRole("button", { name: "Create draft episode" }).click();
  await expect(page.getByText("Draft episode created")).toBeVisible();
  await page.getByRole("button", { name: "Publish episode + animal" }).click();
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
  await expect(page.getByText("isn't published yet")).toHaveCount(0);
  const link = await page.getByTestId("link-instagram").textContent();
  expect(link).toContain(`/r/${slug}-hedge-rescue?utm_source=instagram&utm_medium=reel`);

  // The public campaign link now shows Hazel, with her uploaded art.
  await ap.goto(new URL(link!).pathname + new URL(link!).search);
  await expect(ap.getByTestId("animal-name")).toHaveText("Hazel");
  await expect(ap.getByRole("img", { name: "Hazel the hedgehog curled in leaves" })).toBeVisible();
  await anon.close();
});

test("waitlist mode: no premature play, verified email, neutral duplicates", async ({ page }) => {
  await setLaunchMode("waitlist");
  await page.goto("/r/maple-flood-rescue?utm_source=facebook");
  await expect(page.getByTestId("adopt-cta")).toHaveCount(0);
  const email = newEmail("wait");
  await page.getByLabel("Get an invite when the sanctuary opens").fill(email);
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(page.getByText(/Check your inbox/)).toBeVisible();

  // Duplicate → identical neutral response.
  await page.reload();
  await page.getByLabel("Get an invite when the sanctuary opens").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(page.getByText(/Check your inbox/)).toBeVisible();

  const mail = await waitForMail(email, (m) => m.subject.includes("waitlist"));
  await page.goto(extractLink(mail, "/waitlist/verify"));
  await expect(page.getByRole("heading", { name: /You're on the list/ })).toBeVisible();
  const { rows } = await pool.query(`select status from public.waitlist_entries where normalized_email = $1`, [email]);
  expect(rows).toEqual([{ status: "verified" }]);

  // Adoption is blocked server-side even if the URL is visited directly.
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, newEmail("early"));
  await completeOnboarding(page);
  await expect(page.getByText("Adoptions open soon")).toBeVisible();
  await expect(page.getByTestId("confirm-adopt")).toHaveCount(0);
});
