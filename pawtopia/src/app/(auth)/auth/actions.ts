"use server";
import { cookies } from "next/headers";
import { NEXT_COOKIE } from "@/lib/attribution";
import { env } from "@/lib/env";
import { recordEvent } from "@/lib/analytics";
import { sanitizeNext } from "@/lib/safe-redirect";

/**
 * Runs just before the browser asks Supabase for a sign-in email: remembers
 * where to return after verification and records the funnel step.
 * (The Supabase call itself happens in the browser so auth rate limits apply
 * per player IP rather than to the server's shared IP.)
 */
export async function prepareSignIn(rawNext: string): Promise<{ next: string }> {
  const next = sanitizeNext(rawNext, "/app");
  const store = await cookies();
  store.set(NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 30,
    path: "/",
    secure: env.siteUrl.startsWith("https"),
  });
  const animalSlug = next.match(/^\/animals\/([a-z0-9-]+)/)?.[1] ?? null;
  await recordEvent({ event: "signup_started", animalSlug });
  return { next };
}
