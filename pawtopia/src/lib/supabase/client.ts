"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Browser client (used for admin media uploads straight to Storage). */
export function getBrowserClient() {
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
