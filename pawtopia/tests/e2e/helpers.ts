import { expect, type Page } from "@playwright/test";
import crypto from "node:crypto";
import pg from "pg";

const MAIL_API = process.env.E2E_MAIL_API ?? "http://127.0.0.1:54324";
export const pool = new pg.Pool({
  connectionString: process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres",
  max: 3,
});

export const newEmail = (tag: string) => `${tag}-${crypto.randomUUID().slice(0, 8)}@example.test`;

type Mail = { subject: string; text: string; html: string };

async function mailCount(to: string) {
  const res = await fetch(`${MAIL_API}/messages?to=${encodeURIComponent(to)}`);
  return ((await res.json()) as Mail[]).length;
}

/** Waits for an email to `to`, ignoring the first `after` messages (already received). */
export async function waitForMail(to: string, match: (m: Mail) => boolean = () => true, after = 0): Promise<Mail> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAIL_API}/messages?to=${encodeURIComponent(to)}`);
    const list = ((await res.json()) as Mail[]).slice(after);
    const found = [...list].reverse().find(match);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email for ${to}`);
}

function extractCode(mail: Mail) {
  const m = mail.text.match(/\b(\d{6})\b/);
  if (!m) throw new Error("no code in email");
  return m[1];
}

export function extractLink(mail: Mail, contains: string) {
  const m = mail.text.match(new RegExp(`https?://[^\\s\\]]*${contains}[^\\s\\]]*`));
  if (!m) throw new Error(`no ${contains} link in email`);
  return m[0];
}

/** Signs in on the current page with the emailed 6-digit code (page must be on /auth). */
export async function signInWithCode(page: Page, email: string) {
  const before = await mailCount(email);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByText("Sent to")).toBeVisible();
  const code = extractCode(await waitForMail(email, () => true, before));
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Enter Pawtopia" }).click();
}

export async function completeOnboarding(page: Page, name = "Sam") {
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel(/What should your animals call you/).fill(name);
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("checkbox", { name: /13 years old/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function setLaunchMode(mode: "open" | "waitlist") {
  await pool.query(`update public.app_settings set value = jsonb_set(value, '{mode}', to_jsonb($1::text)) where key = 'launch'`, [mode]);
}
