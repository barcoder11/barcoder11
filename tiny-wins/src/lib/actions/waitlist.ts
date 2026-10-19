"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/waitlist/tokens";

export type ConfirmState =
  | null
  | { ok: true; position: number }
  | { ok: false; reason: "invalid" | "expired" | "unavailable" };

export async function confirmWaitlistAction(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const token = String(formData.get("token") ?? "");
  if (!token || token.length > 200) return { ok: false, reason: "invalid" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: "unavailable" };
  const { data, error } = await admin.rpc("waitlist_confirm", { p_token_hash: hashToken(token) });
  if (error || !data) return { ok: false, reason: "unavailable" };
  const r = data as { ok: boolean; position?: number; reason?: "invalid" | "expired" };
  return r.ok ? { ok: true, position: Number(r.position ?? 0) } : { ok: false, reason: r.reason ?? "invalid" };
}

export type LeaveState = null | { ok: boolean };

export async function leaveWaitlistAction(_prev: LeaveState, formData: FormData): Promise<LeaveState> {
  const token = String(formData.get("token") ?? "");
  if (!token || token.length > 200) return { ok: false };
  const admin = createAdminClient();
  if (!admin) return { ok: false };
  const { error } = await admin.rpc("waitlist_leave", { p_token_hash: hashToken(token) });
  // Success even when the email was already removed: the result is the same.
  return { ok: !error };
}
