import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/attribution";
import { getSessionUser } from "@/lib/auth";
import { many, one } from "@/lib/data/db";
import { localDate } from "@/lib/game";
import type { CareAction, Chapter, Decor, Habitat, Placement, UserAnimal } from "@/lib/types";

// Player-state reads. RLS restricts every query to the signed-in player's own
// rows; the explicit user_id filters keep query plans index-friendly.

export const getWallet = cache(async () => {
  const user = await getSessionUser();
  if (!user) return 0;
  const supabase = await createClient();
  const row = one(await supabase.from("wallets").select("acorns").eq("user_id", user.id).maybeSingle(), "wallet");
  return row?.acorns ?? 0;
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
  if (!user || !isUuid(id)) return null;
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
  return row?.id ?? null;
}

/** Latest time each care action was performed for this adoption (for cooldown rings). */
export async function getLastCareTimes(userAnimalId: string) {
  if (!isUuid(userAnimalId)) return {}; // may come straight from the URL
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
  for (const row of rows) last[row.action_type] ??= row.performed_at;
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
  return [...new Set(rows.map((r) => r.action_type))];
}

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
    const rows = many(await query, "unlocked chapters");
    return rows.flatMap((r) =>
      r.story_chapters ? [{ ...r.story_chapters, user_animal_id: r.user_animal_id, unlocked_at: r.unlocked_at }] : [],
    );
  },
);

export const getSanctuary = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const [sanctuaryResult, placementsResult, inventoryResult] = await Promise.all([
    // The habitat comes embedded, saving a second round trip for the scene.
    supabase.from("sanctuaries").select("*, habitats(*)").eq("user_id", user.id).maybeSingle(),
    supabase.from("sanctuary_placements").select("slot_id, habitat_slug, decor_catalog(slug)").eq("user_id", user.id),
    supabase.from("user_inventory").select("acquired_at, source, decor_catalog(*)").eq("user_id", user.id),
  ]);
  const sanctuary = one(sanctuaryResult, "sanctuary");
  const placements = many(placementsResult, "placements");
  const inventory = many(inventoryResult, "inventory");
  const habitatSlug = sanctuary?.habitat_slug ?? "forest-glade";
  return {
    name: sanctuary?.name ?? "My Sanctuary",
    habitatSlug,
    habitat: (sanctuary?.habitats ?? null) as Habitat | null,
    placements: placements.flatMap((p): Placement[] =>
      p.habitat_slug === habitatSlug && p.decor_catalog
        ? [{ slot_id: p.slot_id, decor_slug: p.decor_catalog.slug }]
        : [],
    ),
    // Items whose catalog entry was disabled are hidden by RLS; skip them.
    inventory: inventory.flatMap((i) => (i.decor_catalog ? [{ ...(i.decor_catalog as Decor), source: i.source }] : [])),
  };
});
