import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ECONOMY } from "@/lib/game";
import type {
  Animal, AnimalAsset, AssetState, ChapterOutline, Decor, Economy, Habitat, LaunchSettings, RescueStory,
} from "@/lib/types";

const ANIMAL_FIELDS = "*, animal_assets(*)";

export const getLaunchSettings = cache(async (): Promise<LaunchSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "launch").maybeSingle();
  const value = (data?.value ?? {}) as Partial<LaunchSettings>;
  return { mode: value.mode === "open" ? "open" : "waitlist", featured_animal_slug: value.featured_animal_slug };
});

export const getEconomy = cache(async (): Promise<Economy> => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "economy").maybeSingle();
  return { ...DEFAULT_ECONOMY, ...((data?.value ?? {}) as Partial<Economy>) };
});

/** Published + coming-soon animals (RLS also lets admins see drafts; filtered out here). */
export const listCatalogAnimals = cache(async (): Promise<Animal[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("animals")
    .select(ANIMAL_FIELDS)
    .in("status", ["published", "coming_soon"])
    .order("sort_order")
    .order("name");
  return (data ?? []) as Animal[];
});

export const getAnimalBySlug = cache(async (slug: string): Promise<Animal | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("animals").select(ANIMAL_FIELDS).eq("slug", slug).maybeSingle();
  return (data as Animal | null) ?? null;
});

export const getRescueBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rescue_stories")
    .select(`*, animals(${ANIMAL_FIELDS})`)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const { animals, ...rescue } = data as RescueStory & { animals: Animal };
  return { rescue: rescue as RescueStory, animal: animals };
});

export const listRescuesForAnimal = cache(async (animalId: string): Promise<RescueStory[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rescue_stories")
    .select("*")
    .eq("animal_id", animalId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data ?? []) as RescueStory[];
});

export const listPublishedRescues = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rescue_stories")
    .select(`*, animals(${ANIMAL_FIELDS})`)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);
  return (data ?? []) as (RescueStory & { animals: Animal })[];
});

export const getChapterOutline = cache(async (animalId: string): Promise<ChapterOutline[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("animal_chapter_outline", { p_animal_id: animalId });
  return (data ?? []) as ChapterOutline[];
});

export const listDecor = cache(async (): Promise<Decor[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("decor_catalog").select("*").eq("enabled", true).order("sort_order");
  return (data ?? []) as Decor[];
});

export const getHabitat = cache(async (slug: string): Promise<Habitat | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("habitats").select("*").eq("slug", slug).maybeSingle();
  return (data as Habitat | null) ?? null;
});

/** Active assets keyed by state, so components can fall back to placeholder art per state. */
export function assetMap(animal: Pick<Animal, "animal_assets">): Partial<Record<AssetState, AnimalAsset>> {
  const map: Partial<Record<AssetState, AnimalAsset>> = {};
  for (const a of animal.animal_assets ?? []) if (a.is_active) map[a.state] = a;
  return map;
}
