import Link from "next/link";
import { AnimalArt } from "@/components/art/AnimalArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { assetMap, isNewArrival } from "@/lib/animals";
import type { Animal } from "@/lib/types";

const SCENE_FOR: Record<string, string> = { riverbank: "river", "frosty-cove": "snow" };

export function AnimalCard({ animal, href }: { animal: Animal; href?: string }) {
  const comingSoon = animal.status !== "published";
  const assets = assetMap(animal);
  const body = (
    <div
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-soft ring-1 ring-ink/5 transition ${comingSoon ? "" : "hover:-translate-y-1 hover:shadow-xl"}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <SceneBackdrop style={SCENE_FOR[animal.habitat_slug ?? ""] ?? "forest"} />
        <div
          className={`absolute inset-x-0 bottom-1 mx-auto h-[82%] w-[70%] ${comingSoon ? "opacity-40 grayscale" : ""}`}
        >
          <AnimalArt animal={animal} assets={assets} />
        </div>
        {comingSoon && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cream">
            🔒 Coming soon
          </span>
        )}
        {isNewArrival(animal) && (
          <span
            className="absolute left-3 top-3 rounded-full bg-honey px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink"
            data-testid="new-badge"
          >
            ✨ New rescue
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-extrabold uppercase tracking-widest text-terracotta">{animal.species}</p>
        <h3 className="font-display text-2xl font-bold">{animal.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{animal.tagline}</p>
        {!comingSoon && (
          <span className="mt-3 inline-flex items-center gap-1 font-display font-semibold text-forest group-hover:underline">
            Meet {animal.name} →
          </span>
        )}
      </div>
    </div>
  );
  if (comingSoon) return body;
  return (
    <Link href={href ?? `/animals/${animal.slug}`} className="block h-full rounded-[1.75rem]">
      {body}
    </Link>
  );
}
