import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";
import { ANON_COOKIE, FIRST_TOUCH_COOKIE, encodeFirstTouch, firstTouchFromUrl, isUuid } from "@/lib/attribution";
import { buildCsp, createNonce } from "@/lib/csp";

const PROTECTED = ["/app", "/admin", "/onboarding"];

function isProtected(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Runs before every page request:
 *   1. refreshes the Supabase session (getClaims) and verifies the JWT,
 *   2. redirects signed-out visitors away from protected areas,
 *   3. sets the pseudonymous visitor id and first-touch attribution cookies,
 *   4. applies a per-request nonce-based Content-Security-Policy.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const https = request.nextUrl.protocol === "https:";
  const nonce = createNonce();
  const csp = buildCsp({ nonce, supabaseUrl: env.supabaseUrl, dev: process.env.NODE_ENV === "development", https });

  // Forward the request to the app with the nonce (Next.js stamps it on its scripts).
  // Rebuilt after a token refresh so rendering sees the refreshed cookies.
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    return NextResponse.next({ request: { headers } });
  };

  let response = forward();
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
          response = forward();
          cookiesToSet.forEach((c) => pendingCookies.push(c as (typeof pendingCookies)[number]));
          Object.assign(pendingHeaders, headers);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub ?? null;
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
      secure: https,
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
        secure: https,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
  }

  for (const c of pendingCookies) response.cookies.set(c.name, c.value, c.options);
  for (const [k, v] of Object.entries(pendingHeaders)) response.headers.set(k, v);
  response.headers.set("Content-Security-Policy", csp);
  // Personalised responses must never be shared by a CDN.
  if (userId || isProtected(pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon|app-icon/|manifest.webmanifest|.*opengraph-image|sitemap.xml|robots.txt|assets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm)$).*)",
  ],
};
