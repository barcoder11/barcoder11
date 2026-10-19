import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { one } from "@/lib/data/db";

type SessionUser = { id: string; email: string | null };

/** Verified current user (JWT validated by Supabase), deduped per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  return one<Profile>(await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(), "profile");
});

export async function requireUser(next: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(next)}`);
  return user;
}

/** Signed in and onboarded. */
export async function requirePlayer(next: string) {
  const user = await requireUser(next);
  const profile = await getProfile();
  if (!profile?.onboarding_completed_at) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return { user, profile };
}

export const getIsEditor = cache(async () => {
  const user = await getSessionUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_content_editor");
  return data === true;
});

export const getIsAdmin = cache(async () => {
  const user = await getSessionUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});

/** Admin area guard: unauthenticated users go to sign-in, everyone else without a role gets a 404. */
export async function requireEditor(next = "/admin") {
  await requireUser(next);
  if (!(await getIsEditor())) notFound();
}

export async function requireAdmin(next = "/admin") {
  await requireUser(next);
  if (!(await getIsAdmin())) notFound();
}
