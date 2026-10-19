import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn } from "@/lib/post-sign-in";

/** Final step after the browser verified a code or link: attribution, admin bootstrap, redirect. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.redirect(new URL("/auth?error=auth_failed", request.url));
  }
  const target = await finishSignIn(supabase, request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(target, request.url));
}
