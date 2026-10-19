import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ECONOMY } from "@/lib/game";
import { many, one } from "@/lib/data/db";
import type {
  Animal, ChapterOutline, Decor, Economy, Habitat, LaunchSettings, RescueStory,
} from "@/lib/types";

// Public catalog reads. They run with the visitor's session, so RLS decides
// visibility: visitors see published/coming-soon content, editors also see drafts.

const ANIMAL_FIELDS = "*, animal_assets(*)";

export const getLaunchSettings = cache(async (): Promise<LaunchSettings> => {
  const supabase = await createClient();
  const row = one(await supabase.from("app_settings").select("value").eq("key", "launch").maybeSingle(), "launch settings");
  const value = (row?.value ?? {}) as Partial<LaunchSettings>;
  return { mode: value.mode === "open" ? "open" : "waitlist", featured_animal_slug: value.featured_animal_slug };
});

export const getEconomy = cache(async (): Promise<Economy> => {
  const supabase = await createClient();
  const row = one(await supabase.from("app_settings").select("value").eq("key", "economy").maybeSingle(), "economy settings");
  return { ...DEFAULT_ECONOMY, ...((row?.value ?? {}) as Partial<Economy>) };
});

/** Published + coming-soon animals (drafts visible to editors are filtered out here). */
export const listCatalogAnimals = cache(async (): Promise<Animal[]> => {
  const supabase = await createClient();
  const result = await supabase
    .from("animals")
    .select(ANIMAL_FIELDS)
    .in("status", ["published", "coming_soon"])
    .order("sort_order")
    .order("name");
  return many(result, "catalog animals") as Animal[];
});

export const getAnimalBySlug = cache(async (slug: string): Promise<Animal | null> => {
  const supabase = await createClient();
  return one(await supabase.from("animals").select(ANIMAL_FIELDS).eq("slug", slug).maybeSingle(), "animal by slug") as Animal | null;
});

export const getRescueBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const row = one(
    await supabase.from("rescue_stories").select(`*, animals(${ANIMAL_FIELDS})`).eq("slug", slug).maybeSingle(),
    "rescue by slug",
  );
  if (!row) return null;
  const { animals, ...rescue } = row as RescueStory & { animals: Animal };
  return { rescue: rescue as RescueStory, animal: animals };
});

export const listRescuesForAnimal = cache(async (animalId: string): Promise<RescueStory[]> => {
  const supabase = await createClient();
  const result = await supabase
    .from("rescue_stories")
    .select("*")
    .eq("animal_id", animalId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return many(result, "rescues for animal") as RescueStory[];
});

export const listPublishedRescues = cache(async () => {
  const supabase = await createClient();
  const result = await supabase
    .from("rescue_stories")
    .select(`*, animals(${ANIMAL_FIELDS})`)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);
  return many(result, "published rescues") as (RescueStory & { animals: Animal })[];
});

export const getChapterOutline = cache(async (animalId: string): Promise<ChapterOutline[]> => {
  const supabase = await createClient();
  return many(await supabase.rpc("animal_chapter_outline", { p_animal_id: animalId }), "chapter outline") as ChapterOutline[];
});

export const listDecor = cache(async (): Promise<Decor[]> => {
  const supabase = await createClient();
  return many(
    await supabase.from("decor_catalog").select("*").eq("enabled", true).order("sort_order"),
    "decor catalog",
  ) as Decor[];
});

export const getHabitat = cache(async (slug: string): Promise<Habitat | null> => {
  const supabase = await createClient();
  return one(await supabase.from("habitats").select("*").eq("slug", slug).maybeSingle(), "habitat") as Habitat | null;
});
