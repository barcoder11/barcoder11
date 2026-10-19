import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { CareAction, Chapter, Decor, Placement, UserAnimal } from "@/lib/types";

export const getWallet = cache(async () => {
  const user = await getSessionUser();
  if (!user) return 0;
  const supabase = await createClient();
  const { data } = await supabase.from("wallets").select("acorns").eq("user_id", user.id).maybeSingle();
  return (data?.acorns as number | undefined) ?? 0;
});

export const listAdoptions = cache(async (): Promise<UserAnimal[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_animals")
    .select("*, animals(*, animal_assets(*))")
    .eq("user_id", user.id)
    .order("adopted_at");
  return (data ?? []) as UserAnimal[];
});

export const getAdoption = cache(async (id: string): Promise<UserAnimal | null> => {
  const user = await getSessionUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_animals")
    .select("*, animals(*, animal_assets(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as UserAnimal | null) ?? null;
});

/** Latest time each care action was performed for this adoption (for cooldown rings). */
export async function getLastCareTimes(userAnimalId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("care_actions")
    .select("action_type, performed_at")
    .eq("user_animal_id", userAnimalId)
    .gte("performed_at", since)
    .order("performed_at", { ascending: false })
    .limit(50);
  const last: Partial<Record<CareAction, string>> = {};
  for (const row of data ?? []) {
    const t = row.action_type as CareAction;
    if (!last[t]) last[t] = row.performed_at as string;
  }
  return last;
}

export const getUnlockedChapters = cache(async (userAnimalId?: string): Promise<(Chapter & { user_animal_id: string; unlocked_at: string })[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  let query = supabase
    .from("user_story_unlocks")
    .select("user_animal_id, unlocked_at, story_chapters(*)")
    .eq("user_id", user.id)
    .order("unlocked_at");
  if (userAnimalId) query = query.eq("user_animal_id", userAnimalId);
  const { data } = await query;
  type Row = { user_animal_id: string; unlocked_at: string; story_chapters: Chapter | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.story_chapters)
    .map((r) => ({ ...(r.story_chapters as Chapter), user_animal_id: r.user_animal_id, unlocked_at: r.unlocked_at }));
});

type PlacementRow = { slot_id: string; habitat_slug: string; decor_catalog: { slug: string } | null };
type InventoryRow = { source: string; acquired_at: string; decor_catalog: Decor | null };

export const getSanctuary = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: sanctuary }, { data: placements }, { data: inventory }] = await Promise.all([
    supabase.from("sanctuaries").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("sanctuary_placements").select("slot_id, habitat_slug, decor_catalog(slug)").eq("user_id", user.id),
    supabase.from("user_inventory").select("acquired_at, source, decor_catalog(*)").eq("user_id", user.id),
  ]);
  const habitatSlug = (sanctuary?.habitat_slug as string | undefined) ?? "forest-glade";
  return {
    name: (sanctuary?.name as string | undefined) ?? "My Sanctuary",
    habitatSlug,
    placements: ((placements ?? []) as unknown as PlacementRow[])
      .filter((p) => p.habitat_slug === habitatSlug && p.decor_catalog)
      .map((p) => ({ slot_id: p.slot_id, decor_slug: p.decor_catalog!.slug })) as Placement[],
    inventory: ((inventory ?? []) as unknown as InventoryRow[])
      .filter((i) => i.decor_catalog)
      .map((i) => ({ ...(i.decor_catalog as Decor), source: i.source })),
  };
});
