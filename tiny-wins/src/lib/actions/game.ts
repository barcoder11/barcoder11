"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { friendlyGameError } from "@/lib/game/constants";
import { GOALS, ROOM_SLOTS, type ActionResult, type CompleteQuestResult, type Quest, type RoomSlot } from "@/lib/game/types";
import { ONBOARDED_COOKIE } from "@/lib/supabase/proxy";
import { createClient } from "@/lib/supabase/server";

/**
 * Game mutations. Each one calls a SECURITY DEFINER database function that
 * re-checks the signed-in user, validates the request, and applies the
 * change atomically. Nothing here trusts amounts sent from the browser.
 */

const uuid = z.uuid();
const itemId = z.string().regex(/^[a-z0-9-]{1,64}$/);
const slot = z.enum(ROOM_SLOTS);

async function call<T>(fn: string, args: Record<string, unknown>): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (!/^(P0001|22023|P0002|28000)$/.test(error.code ?? "")) console.error(`[game] ${fn}`, error.code, error.message);
    return { ok: false, error: friendlyGameError(error.message) };
  }
  return { ok: true, data: data as T };
}

export async function completeQuestAction(questId: string): Promise<ActionResult<CompleteQuestResult>> {
  if (!uuid.safeParse(questId).success) return { ok: false, error: "We couldn't find that quest." };
  const result = await call<CompleteQuestResult>("complete_quest", { p_quest_id: questId });
  if (result.ok) refresh();
  return result;
}

export async function swapQuestAction(questId: string): Promise<ActionResult<{ quests: Quest[] }>> {
  if (!uuid.safeParse(questId).success) return { ok: false, error: "We couldn't find that quest." };
  const result = await call<{ quests: Quest[] }>("swap_quest", { p_quest_id: questId });
  if (result.ok) refresh();
  return result;
}

export type PurchaseResult = { itemId: string; equipped: boolean; acorns: number; achievements: { id: string; title: string; icon: string; acorns: number }[] };

export async function purchaseItemAction(id: string): Promise<ActionResult<PurchaseResult>> {
  if (!itemId.safeParse(id).success) return { ok: false, error: "That item isn't in the shop." };
  const result = await call<PurchaseResult>("purchase_item", { p_item_id: id });
  if (result.ok) refresh();
  return result;
}

export async function equipItemAction(id: string): Promise<ActionResult<{ slot: RoomSlot }>> {
  if (!itemId.safeParse(id).success) return { ok: false, error: "That item isn't in the shop." };
  const result = await call<{ slot: RoomSlot }>("equip_item", { p_item_id: id });
  if (result.ok) refresh();
  return result;
}

export async function unequipSlotAction(s: string): Promise<ActionResult<{ slot: RoomSlot }>> {
  if (!slot.safeParse(s).success) return { ok: false, error: "Unknown spot." };
  const result = await call<{ slot: RoomSlot }>("unequip_slot", { p_slot: s });
  if (result.ok) refresh();
  return result;
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Please enter a name.").max(40, "Keep it to 40 characters."),
  goals: z.array(z.enum(GOALS)).min(1, "Pick at least one goal.").max(5),
  energyTime: z.enum(["morning", "afternoon", "evening", "anytime"]),
  stepSize: z.enum(["tiny", "small"]),
  timezone: z.string().min(1).max(64),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export async function saveProfileAction(input: ProfileInput, finishOnboarding = false): Promise<ActionResult<null>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your answers." };
  const p = parsed.data;
  const result = await call<unknown>("save_profile", {
    p_display_name: p.displayName,
    p_goals: p.goals,
    p_energy_time: p.energyTime,
    p_step_size: p.stepSize,
    p_timezone: p.timezone,
    p_finish_onboarding: finishOnboarding,
  });
  if (!result.ok) return result;
  if (finishOnboarding) {
    // Clears the cached "onboarded" flag; the proxy re-checks on next request.
    (await cookies()).delete(ONBOARDED_COOKIE);
  } else {
    refresh();
  }
  return { ok: true, data: null };
}
