"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { log } from "@/lib/log";
import type { CareAction, CareResult, Placement } from "@/lib/types";

/** Logs a failed database call (error code only) and returns the generic failure. */
function failure(context: string, error: { code?: string }) {
  log.error(`${context} failed`, { code: error.code });
  return { status: "error" } as const;
}

const uuid = z.string().uuid();
const careSchema = z.object({
  userAnimalId: uuid,
  action: z.enum(["comfort", "snack", "play", "rest"]),
  key: uuid,
});

/**
 * One care interaction. Rewards are computed entirely in the database from
 * server config; the idempotency key makes retries and double taps harmless.
 */
export async function performCare(userAnimalId: string, action: CareAction, key: string): Promise<CareResult> {
  const parsed = careSchema.safeParse({ userAnimalId, action, key });
  if (!parsed.success) return { status: "invalid_request" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("perform_care", {
    p_user_animal_id: parsed.data.userAnimalId,
    p_action: parsed.data.action,
    p_idempotency_key: parsed.data.key,
  });
  if (error) return failure("perform_care", error);
  return data as CareResult;
}

export type ShopResult = { status: string; balance?: number; price?: number };

export async function buyDecor(slug: string, key: string): Promise<ShopResult> {
  const parsed = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,60}$/), key: uuid }).safeParse({ slug, key });
  if (!parsed.success) return { status: "invalid_request" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_decor", {
    p_decor_slug: parsed.data.slug,
    p_idempotency_key: parsed.data.key,
  });
  if (error) return failure("purchase_decor", error);
  revalidatePath("/app/sanctuary");
  return data as ShopResult;
}

type PlaceResult = { status: string; placements?: Placement[]; expected?: string };

export async function placeDecor(slotId: string, slug: string): Promise<PlaceResult> {
  const parsed = z
    .object({ slotId: z.string().regex(/^[a-z0-9-]{1,40}$/), slug: z.string().regex(/^[a-z0-9-]{1,60}$/) })
    .safeParse({ slotId, slug });
  if (!parsed.success) return { status: "invalid_request" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_decor", {
    p_slot_id: parsed.data.slotId,
    p_decor_slug: parsed.data.slug,
  });
  if (error) return failure("place_decor", error);
  return data as PlaceResult;
}

export async function removeDecor(slotId: string): Promise<PlaceResult> {
  if (!/^[a-z0-9-]{1,40}$/.test(slotId)) return { status: "invalid_request" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_decor", { p_slot_id: slotId });
  if (error) return failure("remove_decor", error);
  return data as PlaceResult;
}

export async function renameAdoption(userAnimalId: string, nickname: string) {
  const parsed = z.object({ id: uuid, nickname: z.string().trim().max(30) }).safeParse({ id: userAnimalId, nickname });
  if (!parsed.success) return { status: "invalid_nickname" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rename_adoption", {
    p_user_animal_id: parsed.data.id,
    p_nickname: parsed.data.nickname || null,
  });
  if (error) return failure("rename_adoption", error);
  revalidatePath(`/app/animals/${parsed.data.id}`);
  return data as { status: string; nickname?: string | null };
}

export async function renameSanctuary(name: string) {
  const parsed = z.string().trim().min(1).max(40).safeParse(name);
  if (!parsed.success) return { status: "invalid_name" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rename_sanctuary", { p_name: parsed.data });
  if (error) return failure("rename_sanctuary", error);
  revalidatePath("/app/sanctuary");
  return data as { status: string };
}

export type ProfileState = { status?: "ok" | "error"; message?: string };

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const parsed = z
    .object({
      displayName: z.string().trim().max(40),
      timezone: z.string().max(64),
      marketing: z.boolean(),
      reducedMotion: z.boolean(),
    })
    .safeParse({
      displayName: String(form.get("displayName") ?? ""),
      timezone: String(form.get("timezone") ?? "UTC"),
      marketing: form.get("marketing") === "on",
      reducedMotion: form.get("reducedMotion") === "on",
    });
  if (!parsed.success) return { status: "error", message: "Display names can be up to 40 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_profile", {
    p_display_name: parsed.data.displayName || null,
    p_timezone: parsed.data.timezone,
    p_marketing_opt_in: parsed.data.marketing,
    p_reduced_motion: parsed.data.reducedMotion,
  });
  if (error) log.error("update_profile failed", { code: error.code });
  if (error || data?.status !== "ok") return { status: "error", message: "We couldn't save your settings." };
  revalidatePath("/app", "layout");
  return { status: "ok", message: "Saved!" };
}

export type DeleteState = { error?: string };

/** Permanently deletes the account and all player data (cascades from auth.users). */
export async function deleteAccount(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  if (
    String(form.get("confirm") ?? "")
      .trim()
      .toUpperCase() !== "DELETE"
  ) {
    return { error: "Type DELETE to confirm." };
  }
  const user = await getSessionUser();
  if (!user) redirect("/auth");
  const admin = createAdminClient();
  if (!admin) return { error: "Account deletion isn't configured on this server yet. Please contact support." };
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    log.error("account deletion failed", { code: error.code, status: error.status });
    return { error: "We couldn't delete your account. Please try again." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
