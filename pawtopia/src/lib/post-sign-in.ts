import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANON_COOKIE,
  decodeFirstTouch,
  FIRST_TOUCH_COOKIE,
  isUuid,
  NEXT_COOKIE,
  type FirstTouch,
} from "@/lib/attribution";
import type { Database } from "@/lib/database";
import { log } from "@/lib/log";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createAdminClient } from "@/lib/supabase/admin";

/** Emails in ADMIN_EMAILS (comma separated) become admins on their first verified sign-in. */
export function isBootstrapAdmin(email: string | null | undefined, list = process.env.ADMIN_EMAILS) {
  if (!email || !list) return false;
  const wanted = list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return wanted.includes(email.trim().toLowerCase());
}

/**
 * Runs after any successful verification (code, magic link, PKCE callback):
 * records signup + first-touch attribution, bootstraps admins, then decides
 * where to send the user.
 *
 * The return path and first touch normally come from cookies. When the email
 * link is opened on another device/browser those cookies are missing, so we
 * fall back to the copies saved in the new user's metadata at sign-up.
 * (User metadata is user-editable, so both values are sanitised again here.)
 */
export async function finishSignIn(supabase: SupabaseClient<Database>, requestedNext?: string | null) {
  const store = await cookies();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = (claims?.user_metadata ?? {}) as { pt_next?: unknown; pt_ft?: unknown };

  const anon = store.get(ANON_COOKIE)?.value;
  const touch: FirstTouch | null =
    decodeFirstTouch(store.get(FIRST_TOUCH_COOKIE)?.value) ??
    (typeof meta.pt_ft === "string" ? decodeFirstTouch(meta.pt_ft) : null);
  const { error: signupError } = await supabase.rpc("record_signup", {
    p_anonymous_id: isUuid(anon) ? anon : null,
    p_first_touch: touch,
  });
  if (signupError) log.warn("record_signup failed", { code: signupError.code });

  if (claims?.sub && isBootstrapAdmin(claims.email)) await grantBootstrapAdmin(claims.sub);

  const fallbackNext = typeof meta.pt_next === "string" ? meta.pt_next : null;
  const next = sanitizeNext(requestedNext ?? store.get(NEXT_COOKIE)?.value ?? fallbackNext, "/app");
  store.delete(NEXT_COOKIE);

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", claims?.sub ?? "")
    .maybeSingle();
  if (!profile?.onboarding_completed_at) return `/onboarding?next=${encodeURIComponent(next)}`;
  return next;
}

/** Failures are logged: otherwise the owner just signs in without the admin menu and no clue why. */
async function grantBootstrapAdmin(userId: string) {
  const admin = createAdminClient();
  if (!admin) {
    log.error("admin bootstrap skipped: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is not set");
    return;
  }
  const { error } = await admin
    .from("app_roles")
    .upsert(
      { user_id: userId, role: "admin", granted_by: "ADMIN_EMAILS" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  if (error) log.error("admin bootstrap failed", { code: error.code });
}
