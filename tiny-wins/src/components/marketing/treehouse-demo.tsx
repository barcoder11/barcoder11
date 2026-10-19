"use client";

import { useState } from "react";
import { TreehouseScene, type TimeOfDay } from "@/components/treehouse/treehouse-scene";
import { cn } from "@/lib/utils";
import type { RoomLayout } from "@/lib/game/types";

const STAGES: { label: string; level: number; layout: RoomLayout }[] = [
  {
    label: "Day 1",
    level: 1,
    layout: { wallpaper: "plank-walls", floor: "wood-floor", window: "round-window", bed: "leaf-bed" },
  },
  {
    label: "Week 1",
    level: 3,
    layout: {
      wallpaper: "sage-stripes", floor: "wood-floor", window: "flower-window", bed: "quilt-bed", rug: "round-rug",
      plant_left: "fern", wall_art: "acorn-poster", lamp: "mushroom-lamp", lights: "string-lights", desk: "stump-desk",
    },
  },
  {
    label: "Month 1",
    level: 8,
    layout: {
      wallpaper: "starry-walls", floor: "checker-floor", window: "stained-window", bed: "hammock", rug: "cloud-rug",
      plant_left: "monstera", plant_right: "bonsai", wall_art: "forest-map", shelf: "trophy-shelf", desk: "study-desk",
      lamp: "moon-lamp", lights: "firefly-jars",
    },
  },
];

/** Landing-page preview of the treehouse growing. Nothing is saved. */
export function TreehouseDemo() {
  const [stage, setStage] = useState(1);
  const [tod, setTod] = useState<TimeOfDay>("day");
  const s = STAGES[stage];
  return (
    <div>
      <TreehouseScene layout={s.layout} level={s.level} timeOfDay={tod} className="max-w-[440px]" />
      <div className="mx-auto mt-4 flex max-w-[440px] flex-col gap-2">
        <div role="tablist" aria-label="Treehouse progress" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {STAGES.map((st, i) => (
            <button
              key={st.label}
              role="tab"
              aria-selected={stage === i}
              onClick={() => setStage(i)}
              className={cn(
                "h-10 rounded-full text-sm font-bold transition-all",
                stage === i ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-1 text-sm" aria-label="Time of day">
          {(["day", "dusk", "night"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTod(t)}
              aria-pressed={tod === t}
              className={cn(
                "rounded-full px-3 py-1 font-semibold capitalize transition",
                tod === t ? "bg-forest text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t === "day" ? "☀️" : t === "dusk" ? "🌇" : "🌙"} {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
