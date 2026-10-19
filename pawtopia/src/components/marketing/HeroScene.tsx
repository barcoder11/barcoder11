import { AnimalArt, PlaceholderBadge } from "@/components/art/AnimalArt";
import { DecorArt } from "@/components/art/DecorArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { assetMap } from "@/lib/data/catalog";
import type { Animal } from "@/lib/types";

/** Decorative showcase of a sanctuary with the featured animal. */
export function HeroScene({ animal }: { animal: Animal }) {
  const assets = assetMap(animal);
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] shadow-2xl ring-4 ring-white sm:aspect-square">
      <SceneBackdrop style="forest" />
      <div className="absolute left-[6%] top-[60%] w-[26%]">
        <DecorArt artKey="tree" title="" className="w-full" />
      </div>
      <div className="absolute left-[70%] top-[64%] w-[26%]">
        <DecorArt artKey="pond" title="" className="w-full" />
      </div>
      <div className="absolute left-[64%] top-[6%] w-[18%]">
        <DecorArt artKey="lantern" title="" className="w-full" />
      </div>
      <div className="absolute left-[14%] top-[82%] w-[16%]">
        <DecorArt artKey="flowers" title="" className="w-full" />
      </div>
      <div className="absolute bottom-[6%] left-1/2 h-[52%] w-[56%] -translate-x-1/2">
        <AnimalArt animal={animal} assets={assets} priority />
      </div>
      <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
        <span className="rounded-full bg-white/90 px-3 py-1.5 font-display text-sm font-semibold text-forest shadow">
          🐾 {animal.name} · {animal.species}
        </span>
        <PlaceholderBadge assets={assets} />
      </div>
    </div>
  );
}
