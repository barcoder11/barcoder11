"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/env";
import { sanitizeNext } from "@/lib/safe-redirect";

export type OnboardingState = { error?: string };

const schema = z.object({
  displayName: z.string().trim().max(40).optional(),
  timezone: z.string().max(64).optional(),
  habitat: z.enum(["forest", "river", "snow"]).optional(),
  terms: z.literal("on", { message: "terms" }),
  age: z.literal("on", { message: "age" }),
  marketing: z.literal("on").optional(),
  next: z.string().max(300).optional(),
});

export async function completeOnboarding(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const get = (k: string) => (form.get(k) ? String(form.get(k)) : undefined);
  const parsed = schema.safeParse({
    displayName: get("displayName"),
    timezone: get("timezone"),
    habitat: get("habitat"),
    terms: get("terms"),
    age: get("age"),
    marketing: get("marketing"),
    next: get("next"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "terms") return { error: "Please accept the Terms and Privacy Policy to continue." };
    if (field === "age") return { error: "Pawtopia is for players aged 13 and over." };
    return { error: "Display names can be up to 40 characters." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_display_name: parsed.data.displayName ?? null,
    p_timezone: parsed.data.timezone ?? "UTC",
    p_preferred_habitat: parsed.data.habitat ?? null,
    p_accept_terms: true,
    p_confirm_age: true,
    p_terms_version: TERMS_VERSION,
    p_marketing_opt_in: parsed.data.marketing === "on",
  });
  if (error || data?.status !== "ok") return { error: "We couldn't save that. Please try again." };
  redirect(sanitizeNext(parsed.data.next, "/app"));
}
