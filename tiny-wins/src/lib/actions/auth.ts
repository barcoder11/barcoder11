"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailSchema, passwordSchema, signInSchema, signUpSchema } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/env";
import { siteOrigin } from "@/lib/site-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ONBOARDED_COOKIE } from "@/lib/supabase/proxy";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  unconfirmedEmail?: string;
} | null;

const NOT_CONFIGURED: FormState = {
  error: "Accounts aren't connected yet. The site owner needs to add Supabase keys (see README).",
};

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    agree: formData.get("agree"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const { email, password } = parsed.data;

  // Optional invite-only mode: only confirmed waitlist emails may sign up.
  if (process.env.SIGNUP_MODE === "waitlist") {
    const admin = createAdminClient();
    const { data } = admin
      ? await admin.from("waitlist").select("status").eq("email", email).maybeSingle()
      : { data: null };
    if (data?.status !== "confirmed") {
      return { error: "Tiny Wins is invite-only right now. Join the waitlist and confirm your email to get access." };
    }
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` },
  });
  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: error.message } };
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: "Too many sign-up emails right now. Please wait a minute and try again." };
    }
    if (error.code === "signup_disabled") return { error: "Sign-ups are closed right now." };
    console.error("[auth] signUp", error.code, error.message);
    return { error: "We couldn't create your account. Please try again." };
  }
  // Supabase returns the same response for existing emails (no enumeration).
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the link.", unconfirmedEmail: parsed.data.email };
    }
    if (error.status === 429) return { error: "Too many attempts. Please wait a moment and try again." };
    return { error: "That email and password don't match. Try again or reset your password." };
  }
  redirect(safeNextPath(String(formData.get("next") ?? ""), "/home"));
}

export async function resendConfirmationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Please enter a valid email." };
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` },
  });
  if (error?.status === 429) return { error: "Please wait a minute before asking for another email." };
  return { message: "If that account is waiting for confirmation, a new link is on its way." };
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: "Please enter a valid email." } };
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error?.status === 429) return { error: "Please wait a minute before asking for another email." };
  return { message: "If there's an account for that email, a reset link is on its way. Check your inbox." };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { fieldErrors: { password: password.error.issues[0].message } };
  if (formData.get("password") !== formData.get("confirm")) return { fieldErrors: { confirm: "Passwords don't match." } };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you haven't used here before." } };
    return { error: "We couldn't update your password. Please try again." };
  }
  redirect("/home?password=updated");
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(ONBOARDED_COOKIE);
  redirect("/");
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { fieldErrors: { confirm: 'Type DELETE to confirm.' } };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Please log in again." };

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Account deletion needs SUPABASE_SERVICE_ROLE_KEY on the server. Please contact support." };
  }
  // Deleting the auth user cascades to every Tiny Wins table.
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) {
    console.error("[auth] deleteUser", error.message);
    return { error: "We couldn't delete your account. Please try again." };
  }
  await supabase.auth.signOut();
  (await cookies()).delete(ONBOARDED_COOKIE);
  redirect("/?account=deleted");
}
