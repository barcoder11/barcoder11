import { animalCard, OG_SIZE } from "@/lib/og";
import { createPublicClient } from "@/lib/supabase/public";
import type { Animal, AnimalAsset } from "@/lib/types";

export const alt = "Pawtopia animal";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ animalSlug: string }> }) {
  const { animalSlug } = await params;
  const { data } = await createPublicClient()
    .from("animals")
    .select("name, species, placeholder_style, colors, tagline, animal_assets(*)")
    .eq("slug", animalSlug)
    .in("status", ["published", "coming_soon"])
    .maybeSingle();
  const animal = data as (Animal & { animal_assets: AnimalAsset[] }) | null;
  return animalCard({
    animal: animal ?? { name: "Pawtopia", species: "", placeholder_style: "raccoon", colors: {}, tagline: "Every rescue deserves a new beginning." },
    assets: animal?.animal_assets,
    eyebrow: animal ? `Meet the ${animal.species.toLowerCase()}` : "Virtual sanctuary",
  });
}
