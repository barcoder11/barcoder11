import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { many, one } from "@/lib/data/db";
import { localDate } from "@/lib/game";
import type { CareAction, Chapter, Decor, Placement, UserAnimal } from "@/lib/types";

// Player-state reads. RLS restricts every query to the signed-in player's own
// rows; the explicit user_id filters keep query plans index-friendly.

export const getWallet = cache(async () => {
  const user = await getSessionUser();
  if (!user) return 0;
  const supabase = await createClient();
  const row = one(await supabase.from("wallets").select("acorns").eq("user_id", user.id).maybeSingle(), "wallet");
  return (row?.acorns as number | undefined) ?? 0;
});

export const listAdoptions = cache(async (): Promise<UserAnimal[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  const result = await supabase
    .from("user_animals")
    .select("*, animals(*, animal_assets(*))")
    .eq("user_id", user.id)
    .order("adopted_at");
  return many(result, "adoptions") as UserAnimal[];
});

export const getAdoption = cache(async (id: string): Promise<UserAnimal | null> => {
  const user = await getSessionUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const result = await supabase
    .from("user_animals")
    .select("*, animals(*, animal_assets(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return one(result, "adoption") as UserAnimal | null;
});

/** The signed-in player's adoption id for an animal, if any. */
export async function getMyAdoptionId(animalId: string): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const row = one(
    await supabase.from("user_animals").select("id").eq("user_id", user.id).eq("animal_id", animalId).maybeSingle(),
    "adoption id",
  );
  return (row?.id as string | undefined) ?? null;
}

/** Latest time each care action was performed for this adoption (for cooldown rings). */
export async function getLastCareTimes(userAnimalId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const rows = many(
    await supabase
      .from("care_actions")
      .select("action_type, performed_at")
      .eq("user_animal_id", userAnimalId)
      .gte("performed_at", since)
      .order("performed_at", { ascending: false })
      .limit(50),
    "recent care",
  );
  const last: Partial<Record<CareAction, string>> = {};
  for (const row of rows) {
    const t = row.action_type as CareAction;
    if (!last[t]) last[t] = row.performed_at as string;
  }
  return last;
}

/** Care activities that already earned acorns today (player's local day, across all animals). */
export async function getAcornActivitiesToday(timezone: string): Promise<CareAction[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const today = localDate(timezone);
  const supabase = await createClient();
  const rows = many(
    await supabase
      .from("care_actions")
      .select("action_type")
      .eq("user_id", user.id)
      .eq("local_date", today)
      .gt("rewarded_acorns", 0),
    "acorn activities today",
  );
  return [...new Set(rows.map((r) => r.action_type as CareAction))];
}

type UnlockRow = { user_animal_id: string; unlocked_at: string; story_chapters: Chapter | null };

export const getUnlockedChapters = cache(
  async (userAnimalId?: string): Promise<(Chapter & { user_animal_id: string; unlocked_at: string })[]> => {
    const user = await getSessionUser();
    if (!user) return [];
    const supabase = await createClient();
    let query = supabase
      .from("user_story_unlocks")
      .select("user_animal_id, unlocked_at, story_chapters(*)")
      .eq("user_id", user.id)
      .order("unlocked_at");
    if (userAnimalId) query = query.eq("user_animal_id", userAnimalId);
    const rows = many(await query, "unlocked chapters") as unknown as UnlockRow[];
    return rows
      .filter((r) => r.story_chapters)
      .map((r) => ({ ...(r.story_chapters as Chapter), user_animal_id: r.user_animal_id, unlocked_at: r.unlocked_at }));
  },
);

type PlacementRow = { slot_id: string; habitat_slug: string; decor_catalog: { slug: string } | null };
type InventoryRow = { source: string; acquired_at: string; decor_catalog: Decor | null };

export const getSanctuary = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const [sanctuaryResult, placementsResult, inventoryResult] = await Promise.all([
    supabase.from("sanctuaries").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("sanctuary_placements").select("slot_id, habitat_slug, decor_catalog(slug)").eq("user_id", user.id),
    supabase.from("user_inventory").select("acquired_at, source, decor_catalog(*)").eq("user_id", user.id),
  ]);
  const sanctuary = one(sanctuaryResult, "sanctuary");
  const placements = many(placementsResult, "placements") as unknown as PlacementRow[];
  const inventory = many(inventoryResult, "inventory") as unknown as InventoryRow[];
  const habitatSlug = (sanctuary?.habitat_slug as string | undefined) ?? "forest-glade";
  return {
    name: (sanctuary?.name as string | undefined) ?? "My Sanctuary",
    habitatSlug,
    placements: placements
      .filter((p) => p.habitat_slug === habitatSlug && p.decor_catalog)
      .map((p) => ({ slot_id: p.slot_id, decor_slug: p.decor_catalog!.slug })) as Placement[],
    // Items whose catalog entry was disabled are hidden by RLS; skip them.
    inventory: inventory
      .filter((i) => i.decor_catalog)
      .map((i) => ({ ...(i.decor_catalog as Decor), source: i.source })),
  };
});
