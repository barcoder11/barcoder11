"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AdoptState = { error?: string };

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,60}$/),
  nickname: z.string().trim().max(30).optional(),
});

export async function adoptAction(_prev: AdoptState, form: FormData): Promise<AdoptState> {
  const parsed = schema.safeParse({ slug: form.get("slug"), nickname: form.get("nickname") || undefined });
  if (!parsed.success) return { error: "Nicknames can be up to 30 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adopt_animal", {
    p_animal_slug: parsed.data.slug,
    p_nickname: parsed.data.nickname || null,
  });
  if (error) {
    if (error.code === "28000") redirect(`/auth?next=/animals/${parsed.data.slug}/adopt`);
    return { error: "We couldn't complete the adoption. Please try again." };
  }
  switch (data?.status) {
    case "adopted":
      redirect(`/app/animals/${data.user_animal_id}?welcome=1`);
    case "already_adopted":
      redirect(`/app/animals/${data.user_animal_id}`);
    case "onboarding_required":
      redirect(`/onboarding?next=/animals/${parsed.data.slug}/adopt`);
    case "closed":
      return { error: "Adoptions are paused right now — join the waitlist and we'll let you know." };
    case "not_available":
      return { error: "This animal isn't available for adoption." };
    case "invalid_nickname":
      return { error: "Nicknames can be up to 30 characters." };
    default:
      return { error: "Something went wrong. Please try again." };
  }
}
