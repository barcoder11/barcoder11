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
type MailSummary = { ID: string; To: { Address: string }[] | null };

// Mailbox access uses the Mailpit HTTP API (bundled with `supabase start`);
// the Docker-free stack's mail sink implements the same endpoints.

/** Emails sent to `to`, newest first. */
async function listMail(to: string): Promise<MailSummary[]> {
  const query = encodeURIComponent(`to:"${to}"`);
  const res = await fetch(`${MAIL_API}/api/v1/search?query=${query}&limit=100`);
  if (!res.ok) throw new Error(`mailbox search failed (${res.status})`);
  const { messages } = (await res.json()) as { messages: MailSummary[] | null };
  const address = to.toLowerCase();
  return (messages ?? []).filter((m) => m.To?.some((r) => r.Address.toLowerCase() === address));
}

async function readMail(id: string): Promise<Mail> {
  const res = await fetch(`${MAIL_API}/api/v1/message/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`mailbox read failed (${res.status})`);
  const mail = (await res.json()) as { Subject?: string; Text?: string; HTML?: string };
  return { subject: mail.Subject ?? "", text: mail.Text ?? "", html: mail.HTML ?? "" };
}

async function mailCount(to: string) {
  return (await listMail(to)).length;
}

/** Waits for an email to `to`, ignoring the first `after` messages (already received). */
export async function waitForMail(to: string, match: (m: Mail) => boolean = () => true, after = 0): Promise<Mail> {
  for (let i = 0; i < 40; i++) {
    const list = await listMail(to);
    for (const summary of list.slice(0, Math.max(0, list.length - after))) {
      const mail = await readMail(summary.ID);
      if (match(mail)) return mail;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email for ${to}`);
}

/** Text and HTML bodies with entities in links decoded (some mailboxes leave Text empty for HTML-only mail). */
function searchableBody(mail: Mail) {
  return `${mail.text}\n${mail.html.replace(/&amp;/g, "&")}`;
}

function extractCode(mail: Mail) {
  // Tags are stripped so numbers inside attributes (e.g. colours) can't match.
  const m = searchableBody(mail)
    .replace(/<[^>]*>/g, " ")
    .match(/\b(\d{6})\b/);
  if (!m) throw new Error("no code in email");
  return m[1];
}

export function extractLink(mail: Mail, contains: string) {
  const m = searchableBody(mail).match(new RegExp(`https?://[^\\s"'<>\\]]*${contains}[^\\s"'<>\\]]*`));
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
  await pool.query(
    `update public.app_settings set value = jsonb_set(value, '{mode}', to_jsonb($1::text)) where key = 'launch'`,
    [mode],
  );
}
