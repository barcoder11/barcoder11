"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";
import { env } from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

/** Browser client (used for admin media uploads straight to Storage). */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
