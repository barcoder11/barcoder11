import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";
import { env } from "@/lib/env";

/** Anonymous client for public, cacheable reads (no cookies, RLS as `anon`). */
export function createPublicClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
