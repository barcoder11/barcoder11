"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeFirstTouch, FIRST_TOUCH_COOKIE } from "@/lib/attribution";
import { emailConfigured, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { newToken } from "@/lib/tokens";

export type WaitlistState = { status: "idle" | "ok" | "error"; message?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  promo: z.literal("on").optional(),
});

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = schema.safeParse({ email: form.get("email"), promo: form.get("promo") ?? undefined });
  if (!parsed.success) return { status: "error", message: "Please enter a valid email address." };

  const admin = createAdminClient();
  if (!admin) return { status: "error", message: "The waitlist isn't open yet. Please check back soon." };

  const store = await cookies();
  const touch = decodeFirstTouch(store.get(FIRST_TOUCH_COOKIE)?.value);
  const verify = newToken();
  const unsub = newToken();

  const { data, error } = await admin.rpc("waitlist_upsert", {
    p_email: parsed.data.email,
    p_token_hash: verify.hash,
    p_unsubscribe_hash: unsub.hash,
    p_opt_in: parsed.data.promo === "on",
    p_source: touch ?? { source: "direct" },
  });
  if (error) return { status: "error", message: "Something went wrong. Please try again in a moment." };
  if (data?.action === "invalid") return { status: "error", message: "Please enter a valid email address." };

  if (data?.action === "send") {
    const verifyUrl = `${env.siteUrl}/waitlist/verify?token=${verify.token}`;
    const unsubUrl = `${env.siteUrl}/waitlist/unsubscribe?token=${unsub.token}`;
    await sendEmail({
      to: parsed.data.email,
      subject: "Confirm your spot on the Pawtopia waitlist 🐾",
      text: `Thanks for joining the Pawtopia waitlist!\n\nConfirm your email: ${verifyUrl}\n\nNot you? Remove your email: ${unsubUrl}\n\nPawtopia is a fictional virtual game; no real animals are adopted.`,
      html: `<div style="font-family:Arial,sans-serif;color:#183027;max-width:480px"><h2 style="color:#2F6B58">You're almost on the list 🐾</h2><p>Tap below to confirm your email for the Pawtopia waitlist.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#2F6B58;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Confirm my spot</a></p><p style="font-size:12px;color:#5b6b63">Not you, or changed your mind? <a href="${unsubUrl}">Remove my email</a>. Pawtopia is a fictional virtual game; no real animals are adopted.</p></div>`,
    });
  }

  // Same answer for new, pending and already-verified emails (no account enumeration).
  return {
    status: "ok",
    message: emailConfigured()
      ? "Check your inbox for a confirmation link to secure your spot."
      : "Thanks! Your spot is saved. Confirmation emails aren't switched on yet, so we'll confirm your address later.",
  };
}

export async function unsubscribeWaitlist(form: FormData) {
  const token = String(form.get("token") ?? "");
  const remove = form.get("delete") === "1";
  const admin = createAdminClient();
  if (!admin || token.length < 20 || token.length > 100) return;
  const { hashToken } = await import("@/lib/tokens");
  await admin.rpc("waitlist_unsubscribe", { p_unsubscribe_hash: hashToken(token), p_delete: remove });
  const { redirect } = await import("next/navigation");
  redirect(`/waitlist/unsubscribe?done=${remove ? "deleted" : "unsubscribed"}`);
}
