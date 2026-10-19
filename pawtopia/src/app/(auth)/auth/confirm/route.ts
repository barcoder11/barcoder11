import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn } from "@/lib/post-sign-in";

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/** Token-hash magic link (custom templates in supabase/templates). Works across browsers/devices. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type || !TYPES.includes(type)) {
    return NextResponse.redirect(new URL("/auth?error=auth_failed", request.url));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(new URL("/auth?error=link_expired", request.url));
  return NextResponse.redirect(new URL(await finishSignIn(supabase, request.nextUrl.searchParams.get("next")), request.url));
}
