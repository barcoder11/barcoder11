import "server-only";
import { cache } from "react";
import { catalogRead } from "@/lib/data/catalog-cache";
import { many, one } from "@/lib/data/db";
import { DEFAULT_ECONOMY } from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
import type { Animal, ChapterOutline, Decor, Economy, Habitat, LaunchSettings, RescueStory } from "@/lib/types";

// Catalog reads: animals, rescue episodes, chapter outlines and launch settings.
// Anonymous visitors share cached results per catalog version; signed-in visitors
// read live through their session (see catalog-cache.ts).

const ANIMAL_FIELDS = "*, animal_assets(*)";
const RESCUE_WITH_ANIMAL = `*, animals(${ANIMAL_FIELDS})` as const;

export const getLaunchSettings = catalogRead("launch", async (db): Promise<LaunchSettings> => {
  const row = one(await db.from("app_settings").select("value").eq("key", "launch").maybeSingle(), "launch settings");
  const value = (row?.value ?? {}) as Partial<LaunchSettings>;
  return { mode: value.mode === "open" ? "open" : "waitlist", featured_animal_slug: value.featured_animal_slug };
});

export const getEconomy = cache(async (): Promise<Economy> => {
  const supabase = await createClient();
  const row = one(
    await supabase.from("app_settings").select("value").eq("key", "economy").maybeSingle(),
    "economy settings",
  );
  return { ...DEFAULT_ECONOMY, ...((row?.value ?? {}) as Partial<Economy>) };
});

/** Published + coming-soon animals (drafts visible to editors are filtered out here). */
export const listCatalogAnimals = catalogRead("animals", async (db): Promise<Animal[]> => {
  const result = await db
    .from("animals")
    .select(ANIMAL_FIELDS)
    .in("status", ["published", "coming_soon"])
    .order("sort_order")
    .order("name");
  return many(result, "catalog animals") as Animal[];
});

export const getAnimalBySlug = catalogRead("animal", async (db, slug: string): Promise<Animal | null> => {
  return one(
    await db.from("animals").select(ANIMAL_FIELDS).eq("slug", slug).maybeSingle(),
    "animal by slug",
  ) as Animal | null;
});

export const getRescueBySlug = catalogRead("rescue", async (db, slug: string) => {
  const row = one(
    await db.from("rescue_stories").select(RESCUE_WITH_ANIMAL).eq("slug", slug).maybeSingle(),
    "rescue by slug",
  );
  if (!row) return null;
  const { animals, ...rescue } = row;
  return { rescue, animal: animals as Animal };
});

export const listRescuesForAnimal = catalogRead(
  "animal-rescues",
  async (db, animalId: string): Promise<RescueStory[]> => {
    const result = await db
      .from("rescue_stories")
      .select("*")
      .eq("animal_id", animalId)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return many(result, "rescues for animal");
  },
);

export const listPublishedRescues = catalogRead("rescues", async (db) => {
  const result = await db
    .from("rescue_stories")
    .select(RESCUE_WITH_ANIMAL)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);
  return many(result, "published rescues") as (RescueStory & { animals: Animal })[];
});

export const getChapterOutline = catalogRead("outline", async (db, animalId: string): Promise<ChapterOutline[]> => {
  return many(await db.rpc("animal_chapter_outline", { p_animal_id: animalId }), "chapter outline");
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
