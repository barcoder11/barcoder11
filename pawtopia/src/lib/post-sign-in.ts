import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANON_COOKIE, decodeFirstTouch, FIRST_TOUCH_COOKIE, isUuid, NEXT_COOKIE } from "@/lib/attribution";
import { sanitizeNext } from "@/lib/safe-redirect";

/**
 * Runs after any successful verification (code, magic link, PKCE callback):
 * records signup + first-touch attribution, then decides where to send the user.
 */
export async function finishSignIn(supabase: SupabaseClient, requestedNext?: string | null) {
  const store = await cookies();
  const anon = store.get(ANON_COOKIE)?.value;
  const touch = decodeFirstTouch(store.get(FIRST_TOUCH_COOKIE)?.value);
  await supabase.rpc("record_signup", { p_anonymous_id: isUuid(anon) ? anon : null, p_first_touch: touch });

  const next = sanitizeNext(requestedNext ?? store.get(NEXT_COOKIE)?.value, "/app");
  store.delete(NEXT_COOKIE);

  const { data: claims } = await supabase.auth.getClaims();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", claims?.claims?.sub ?? "")
    .maybeSingle();
  if (!profile?.onboarding_completed_at) return `/onboarding?next=${encodeURIComponent(next)}`;
  return next;
}
