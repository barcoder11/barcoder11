import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing spot for links in Supabase auth emails (confirm signup, reset
 * password). Supports both the PKCE `code` flow and `token_hash` links.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"), "/home");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  if (!isSupabaseConfigured) return fail("not_configured");
  const supabase = await createClient();

  const errorCode = url.searchParams.get("error_code");
  if (errorCode) return fail(errorCode === "otp_expired" ? "link_expired" : "link_invalid");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("link_invalid");
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(error.code === "otp_expired" ? "link_expired" : "link_invalid");
  } else {
    return fail("link_invalid");
  }

  const dest = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(new URL(dest, url.origin));
}
