import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn } from "@/lib/post-sign-in";

/** PKCE magic-link callback (default Supabase email templates). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (!code) return NextResponse.redirect(new URL("/auth?error=auth_failed", request.url));
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Typically the link was opened in a different browser than the one that requested it.
    return NextResponse.redirect(
      new URL(`/auth?error=link_expired&next=${encodeURIComponent(next ?? "/app")}`, request.url),
    );
  }
  return NextResponse.redirect(new URL(await finishSignIn(supabase, next), request.url));
}
