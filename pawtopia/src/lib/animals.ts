import type { Animal, AnimalAsset, AssetState } from "@/lib/types";

// Pure helpers about animals (safe for server and client code).

/** Active assets keyed by state, so components can fall back to placeholder art per state. */
export function assetMap(animal: Pick<Animal, "animal_assets">): Partial<Record<AssetState, AnimalAsset>> {
  const map: Partial<Record<AssetState, AnimalAsset>> = {};
  for (const a of animal.animal_assets ?? []) if (a.is_active) map[a.state] = a;
  return map;
}

/** True for animals published within the last `days` days (drives the "New" badge). */
export function isNewArrival(animal: Pick<Animal, "status" | "published_at">, days = 14, now = Date.now()) {
  if (animal.status !== "published" || !animal.published_at) return false;
  return now - new Date(animal.published_at).getTime() < days * 86_400_000;
}
