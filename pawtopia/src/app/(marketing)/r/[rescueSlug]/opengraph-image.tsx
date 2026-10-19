import { isSupabaseConfigured } from "@/lib/env";
import { animalCard, OG_SIZE } from "@/lib/og";
import { createPublicClient } from "@/lib/supabase/public";
import type { Animal, AnimalAsset } from "@/lib/types";

export const alt = "Pawtopia rescue story";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ rescueSlug: string }> }) {
  const { rescueSlug } = await params;
  // Before Supabase is configured every link shows the generic card.
  const { data } = isSupabaseConfigured()
    ? await createPublicClient()
        .from("rescue_stories")
        .select("title, animals(name, species, placeholder_style, colors, tagline, animal_assets(*))")
        .eq("slug", rescueSlug)
        .eq("status", "published")
        .maybeSingle()
    : { data: null };
  const animal = (data?.animals ?? null) as (Animal & { animal_assets: AnimalAsset[] }) | null;
  if (!animal) {
    return animalCard({
      animal: {
        name: "Pawtopia",
        species: "",
        placeholder_style: "raccoon",
        colors: {},
        tagline: "Every rescue deserves a new beginning.",
      },
      eyebrow: "Virtual sanctuary",
    });
  }
  return animalCard({ animal, assets: animal.animal_assets, eyebrow: `${animal.species} rescue story` });
}
