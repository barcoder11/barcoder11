import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database";
import { env } from "@/lib/env";

/**
 * Supabase client bound to the current request's auth cookies.
 * Create a new one per request (never share across requests).
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Client for work scheduled with `after()` in Server Components, which can't
 * read cookies once the response is sent. Call this during render: it
 * snapshots the request's cookies now. The proxy already refreshed the
 * session for this request, so no cookies need to be written later.
 */
export async function createDeferredClient() {
  const snapshot = (await cookies()).getAll();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => snapshot,
      setAll() {},
    },
  });
}
