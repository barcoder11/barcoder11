import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

const APP_PREFIXES = ["/home", "/quests", "/treehouse", "/shop", "/progress", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];
export const ONBOARDED_COOKIE = "tw_onboarded";

function matches(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and routes people:
 *   signed out + app page  -> /login
 *   signed in  + auth page -> /home
 *   signed in, not onboarded + app page -> /onboarding
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApp = matches(path, APP_PREFIXES);
  const isOnboarding = matches(path, ["/onboarding"]);
  const isAuthPage = matches(path, AUTH_PAGES);

  const redirectTo = (pathname: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (keepNext) url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  };

  if (!isSupabaseConfigured) {
    return isApp || isOnboarding ? redirectTo("/login", true) : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Validates the JWT (do not trust getSession() on the server).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const withCookies = (res: NextResponse) => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!userId) {
    if (isApp || isOnboarding) return withCookies(redirectTo("/login", true));
    return response;
  }

  if (isAuthPage) return withCookies(redirectTo("/home"));

  if (isApp) {
    // Cheap check first; the cookie only skips this redirect, it grants nothing.
    const flag = request.cookies.get(ONBOARDED_COOKIE)?.value;
    if (flag !== userId) {
      const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", userId).maybeSingle();
      if (!profile?.onboarded_at) return withCookies(redirectTo("/onboarding"));
      response.cookies.set(ONBOARDED_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  }

  return response;
}
