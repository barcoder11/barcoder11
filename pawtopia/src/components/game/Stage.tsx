import type { ReactNode } from "react";
import { DecorArt } from "@/components/art/DecorArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import type { Decor, HabitatSlot, Placement } from "@/lib/types";

// Sized against both scene width and height (container query units) so items keep
// their proportions on wide desktop scenes as well as tall phone scenes.
const SLOT_WIDTH: Record<HabitatSlot["category"], string> = {
  large: "min(25cqw, 28cqh)",
  hanging: "min(15cqw, 17cqh)",
  small: "min(14cqw, 16cqh)",
};

export function slotStyle(slot: HabitatSlot) {
  return {
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    width: SLOT_WIDTH[slot.category],
    zIndex: slot.z,
    transform: slot.category === "hanging" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
  } as const;
}

/** Layered habitat scene: backdrop, placed decorations (by slot), animal layer and optional overlay. */
export function Stage({
  sceneStyle,
  slots,
  placements,
  decorBySlug,
  children,
  overlay,
  className = "",
}: {
  sceneStyle: string;
  slots: HabitatSlot[];
  placements: Placement[];
  decorBySlug: Record<string, Decor>;
  children?: ReactNode;
  overlay?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ containerType: "size" }}>
      <SceneBackdrop style={sceneStyle} />
      {slots.map((slot) => {
        const placed = placements.find((p) => p.slot_id === slot.id);
        const decor = placed ? decorBySlug[placed.decor_slug] : undefined;
        if (!decor) return null;
        return (
          <div
            key={slot.id}
            className="pointer-events-none absolute pop-in"
            style={slotStyle(slot)}
            data-testid={`placed-${decor.slug}`}
          >
            <DecorArt artKey={decor.art_key} title={decor.name} className="w-full" />
          </div>
        );
      })}
      {children}
      {overlay}
    </div>
  );
}

export const SCENE_STYLE: Record<string, string> = {
  "forest-glade": "forest",
  riverbank: "river",
  "frosty-cove": "snow",
};
