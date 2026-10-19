import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";
import { ANON_COOKIE, FIRST_TOUCH_COOKIE, encodeFirstTouch, firstTouchFromUrl, isUuid } from "@/lib/attribution";

const PROTECTED = ["/app", "/admin", "/onboarding"];

function isProtected(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  let response = NextResponse.next({ request });
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const pendingHeaders: Record<string, string> = {};

  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach((c) => pendingCookies.push(c as (typeof pendingCookies)[number]));
          Object.assign(pendingHeaders, headers);
        },
      },
    });
    // Refreshes the session if needed and verifies the JWT.
    const { data } = await supabase.auth.getClaims();
    userId = (data?.claims?.sub as string | undefined) ?? null;
  }

  if (!userId && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    response = NextResponse.redirect(url);
  }

  // Pseudonymous visitor id for funnel analytics (no PII).
  if (!isUuid(request.cookies.get(ANON_COOKIE)?.value)) {
    response.cookies.set(ANON_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }

  // First-touch attribution from rescue links (kept for 30 days, never overwritten).
  if (!request.cookies.get(FIRST_TOUCH_COOKIE)) {
    const touch = firstTouchFromUrl(pathname, searchParams);
    if (touch) {
      response.cookies.set(FIRST_TOUCH_COOKIE, encodeFirstTouch(touch), {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
  }

  for (const c of pendingCookies) response.cookies.set(c.name, c.value, c.options);
  for (const [k, v] of Object.entries(pendingHeaders)) response.headers.set(k, v);
  // Personalised responses must never be shared by a CDN.
  if (userId || isProtected(pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon|app-icon/|manifest.webmanifest|.*opengraph-image|sitemap.xml|robots.txt|assets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm)$).*)"],
};
