import { expect, test } from "@playwright/test";
import { completeOnboarding, newEmail, pool, setLaunchMode, signInWithCode } from "./helpers";

test("player can export their data and permanently delete their account", async ({ page }) => {
  await setLaunchMode("open");
  const email = newEmail("delete");
  await page.goto("/auth?next=/animals/maple/adopt");
  await signInWithCode(page, email);
  await completeOnboarding(page);
  await page.getByTestId("confirm-adopt").click();
  await expect(page).toHaveURL(/\/app\/animals\//);

  await page.goto("/app/profile");
  const exported = await page.request.get("/app/profile/export");
  expect(exported.status()).toBe(200);
  const data = await exported.json();
  expect(data.email).toBe(email);
  expect(data.adoptions).toHaveLength(1);
  expect(data.wallet.acorns).toBe(50);

  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?deleted=1/);
  const { rows } = await pool.query(`select count(*)::int n from auth.users where email = $1`, [email]);
  expect(rows[0].n).toBe(0);
  const { rows: left } = await pool.query(
    `select count(*)::int n from public.user_animals ua left join auth.users u on u.id = ua.user_id where u.id is null`,
  );
  expect(left[0].n).toBe(0);
  // Signed out: the game redirects to sign-in.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth/);
});
