import { SLOT_BOXES } from "@/components/treehouse/slots";
import { ItemGraphic } from "@/components/treehouse/treehouse-scene";
import type { RoomSlot } from "@/lib/game/types";
import { cn } from "@/lib/utils";

/** Item artwork on its own, for shop cards and pickers. */
export function ItemPreview({ itemId, slot, className }: { itemId: string; slot: RoomSlot; className?: string }) {
  const box = SLOT_BOXES[slot];
  const surface = slot === "wallpaper" || slot === "floor";
  // Surfaces show a swatch; objects get breathing room.
  const w = surface ? 120 : box.w;
  const h = surface ? 120 : box.h;
  const pad = surface ? 0 : Math.max(w, h) * 0.12;
  const size = Math.round((Math.max(w, h) + pad * 2) * 100) / 100;
  const vx = Math.round((-(size - w) / 2) * 100) / 100;
  const vy = Math.round((-(size - h) / 2) * 100) / 100;
  return (
    <svg viewBox={`${vx} ${vy} ${size} ${size}`} className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="tw-window-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9DCE3" />
          <stop offset="1" stopColor="#DDF0E4" />
        </linearGradient>
      </defs>
      {surface ? (
        <g>
          <clipPath id={`clip-${itemId}`}>
            <rect width={w} height={h} rx={18} />
          </clipPath>
          <g clipPath={`url(#clip-${itemId})`}>
            <ItemGraphic itemId={itemId} w={w} h={h} />
          </g>
        </g>
      ) : (
        <ItemGraphic itemId={itemId} w={w} h={h} />
      )}
    </svg>
  );
}
