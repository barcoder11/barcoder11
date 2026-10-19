import "server-only";
import nodemailer from "nodemailer";
import { log } from "@/lib/log";

/**
 * Transactional email (waitlist confirmations) over SMTP. Works with any
 * provider that offers SMTP (Resend, Postmark, SES, SendGrid...). Supabase Auth
 * emails are sent by Supabase itself and configured in the Supabase dashboard.
 */
export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      // Local development convenience only: shows the link you would have received.
      console.info(`[email not configured] would send "${msg.subject}" to ${msg.to}\n${msg.text}`);
    }
    return { sent: false as const, reason: "not_configured" as const };
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  try {
    await transport.sendMail({ from: process.env.EMAIL_FROM, ...msg });
    return { sent: true as const };
  } catch (err) {
    // Provider messages can echo the recipient address, so only codes are logged.
    const { code, responseCode } = (err ?? {}) as { code?: string; responseCode?: number };
    log.error("email send failed", { code, responseCode });
    return { sent: false as const, reason: "send_failed" as const };
  }
}
