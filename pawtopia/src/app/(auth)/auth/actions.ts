"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ANON_COOKIE, isUuid, NEXT_COOKIE } from "@/lib/attribution";
import { env } from "@/lib/env";
import { finishSignIn } from "@/lib/post-sign-in";
import { sanitizeNext } from "@/lib/safe-redirect";

export type AuthState = { step: "email" | "code"; email?: string; next: string; error?: string; info?: string };

const emailSchema = z.string().trim().toLowerCase().email().max(254);

async function siteOrigin() {
  // Prefer the configured site URL so links in emails always point at the real domain.
  if (process.env.NEXT_PUBLIC_SITE_URL) return env.siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : env.siteUrl;
}

export async function sendCode(prev: AuthState, form: FormData): Promise<AuthState> {
  const next = sanitizeNext(String(form.get("next") ?? prev.next), "/app");
  const email = emailSchema.safeParse(form.get("email") ?? prev.email);
  if (!email.success) return { step: "email", next, error: "Please enter a valid email address." };

  const store = await cookies();
  store.set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", maxAge: 60 * 30, path: "/", secure: env.siteUrl.startsWith("https") });

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    const rateLimited = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      step: prev.step,
      email: email.data,
      next,
      error: rateLimited
        ? "Please wait a minute before requesting another code."
        : "We couldn't send the email right now. Please try again shortly.",
    };
  }

  const anon = store.get(ANON_COOKIE)?.value;
  await supabase.rpc("track_event", {
    p_event_type: "signup_started",
    p_anonymous_id: isUuid(anon) ? anon : null,
    p_rescue_slug: null,
    p_animal_slug: next.startsWith("/animals/") ? next.split("/")[2] : null,
    p_attribution: {},
  });
  return { step: "code", email: email.data, next, info: "We sent a sign-in link and a 6-digit code to your email." };
}

export async function verifyCode(prev: AuthState, form: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(prev.email);
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!email.success) return { step: "email", next: prev.next };
  if (token.length < 6 || token.length > 10) return { ...prev, error: "Enter the code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token, type: "email" });
  if (error) return { ...prev, error: "That code didn't work or has expired. Check the latest email, or send a new code." };
  redirect(await finishSignIn(supabase, prev.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
