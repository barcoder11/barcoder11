import "server-only";

import { SITE_URL } from "@/lib/env";

/**
 * Sends waitlist confirmation emails with Resend (https://resend.com).
 * Needs RESEND_API_KEY and WAITLIST_FROM_EMAIL (a sender on a domain you
 * verified in Resend). Without them, emails are not sent: in development the
 * link is printed to the server console instead.
 */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.WAITLIST_FROM_EMAIL);
}

export function confirmUrl(token: string) {
  return `${SITE_URL}/waitlist/confirm?token=${encodeURIComponent(token)}`;
}

export function leaveUrl(token: string) {
  return `${SITE_URL}/waitlist/leave?token=${encodeURIComponent(token)}`;
}

export async function sendWaitlistConfirmation(to: string, token: string): Promise<{ sent: boolean; devUrl?: string }> {
  const link = confirmUrl(token);
  const unsubscribe = leaveUrl(token);

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[waitlist] Email not configured. Confirmation link for ${to}:\n  ${link}`);
      return { sent: false, devUrl: link };
    }
    throw new Error("Email sending is not configured");
  }

  const html = `<!doctype html><html><body style="margin:0;background:#F7F3EA;font-family:Nunito,Arial,sans-serif;color:#2F2A24">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:480px;background:#FFFDF8;border-radius:24px;padding:32px;border:1px solid #E6DECE">
      <tr><td style="font-size:40px;text-align:center">🌰</td></tr>
      <tr><td style="font-size:24px;font-weight:800;text-align:center;padding:8px 0 4px">One tiny step left!</td></tr>
      <tr><td style="font-size:16px;line-height:1.5;text-align:center;padding:8px 0 24px">
        Pip is so excited you want to join the treehouse. Tap below to confirm your spot on the Tiny Wins early-access list.
      </td></tr>
      <tr><td align="center"><a href="${link}" style="display:inline-block;background:#397A69;color:#FFFDF8;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:999px">Confirm my spot</a></td></tr>
      <tr><td style="font-size:13px;color:#6E6558;text-align:center;padding-top:24px;line-height:1.5">
        Big dreams. Small steps. One acorn at a time.<br/>
        Didn't sign up? Ignore this email, or <a href="${unsubscribe}" style="color:#6E6558">remove your email</a>.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const text = `One tiny step left!\n\nConfirm your spot on the Tiny Wins early-access list:\n${link}\n\nDidn't sign up? Ignore this email or remove your email here: ${unsubscribe}\n`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.WAITLIST_FROM_EMAIL,
      to: [to],
      subject: "Confirm your spot in Pip's treehouse 🌰",
      html,
      text,
      headers: { "List-Unsubscribe": `<${unsubscribe}>` },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}
