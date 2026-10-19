"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore, type KeyboardEvent } from "react";
import { Pip } from "@/components/pip/pip";
import type { PipPose } from "@/components/pip/pip-assets";
import { treehouseTier } from "@/lib/game/levels";
import type { RoomLayout, RoomSlot } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { ITEM_ART } from "./item-art";
import { LAMP_ON_FLOOR, SLOT_BOXES, SLOT_LABELS, SLOT_ORDER, type Box } from "./slots";

export type TimeOfDay = "day" | "dusk" | "night";

function timeOfDayNow(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}
const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};

/** The sky follows the viewer's local clock. */
export function useTimeOfDay(): TimeOfDay {
  return useSyncExternalStore(subscribeMinute, timeOfDayNow, () => "day");
}

const SKY: Record<TimeOfDay, [string, string, string]> = {
  day: ["#A9DCE3", "#DDF0E4", "#F7EAD2"],
  dusk: ["#F2A07B", "#F6C79A", "#F7E1C0"],
  night: ["#17223F", "#2B3561", "#4A4470"],
};

type SceneProps = {
  layout: RoomLayout;
  level: number;
  className?: string;
  editMode?: boolean;
  selectedSlot?: RoomSlot | null;
  onSlotSelect?: (slot: RoomSlot) => void;
  pipPose?: PipPose;
  interactivePip?: boolean;
  /** Force a time of day (e.g. on the landing page). */
  timeOfDay?: TimeOfDay;
  pipName?: string;
};

export function TreehouseScene({
  layout,
  level,
  className,
  editMode = false,
  selectedSlot,
  onSlotSelect,
  pipPose = "idle",
  interactivePip = true,
  timeOfDay,
}: SceneProps) {
  const clock = useTimeOfDay();
  const tod = timeOfDay ?? clock;
  const tier = treehouseTier(level);
  const reduce = useReducedMotion();
  const [skyTop, skyMid, skyBottom] = SKY[tod];
  const night = tod === "night";
  const hasGlow = Boolean(layout.lamp || layout.lights);

  const boxFor = (slot: RoomSlot): Box => (slot === "lamp" && !layout.desk ? LAMP_ON_FLOOR : SLOT_BOXES[slot]);

  return (
    <div
      className={cn("relative mx-auto aspect-[4/5] w-full select-none overflow-hidden rounded-[2rem] shadow-lift", className)}
      style={{ background: skyBottom }}
    >
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" role="img" aria-label={`Pip's treehouse, level ${level}`}>
        <defs>
          <linearGradient id="tw-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="0.55" stopColor={skyMid} />
            <stop offset="1" stopColor={skyBottom} />
          </linearGradient>
          <linearGradient id="tw-window-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyMid} />
          </linearGradient>
          <linearGradient id="tw-bark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6E432F" />
            <stop offset="0.5" stopColor="#8A5A40" />
            <stop offset="1" stopColor="#5B3726" />
          </linearGradient>
          <radialGradient id="tw-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#FFD98A" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FFD98A" stopOpacity="0" />
          </radialGradient>
          <clipPath id="tw-room">
            <path d="M60 170 Q60 150 80 150 H320 Q340 150 340 170 V400 H60 Z" />
          </clipPath>
        </defs>

        {/* Sky */}
        <rect width="400" height="500" fill="url(#tw-sky)" />
        {tod === "day" && (
          <g>
            <circle cx="336" cy="62" r="26" fill="#FFE9A8" />
            <circle cx="336" cy="62" r="38" fill="#FFE9A8" opacity="0.3" />
            <g fill="#fff" opacity="0.85" className={reduce ? undefined : "tw-drift"}>
              <ellipse cx="70" cy="70" rx="30" ry="11" />
              <ellipse cx="92" cy="62" rx="20" ry="12" />
              <ellipse cx="250" cy="40" rx="24" ry="8" />
            </g>
          </g>
        )}
        {tod === "dusk" && <circle cx="330" cy="120" r="30" fill="#FFD08A" opacity="0.9" />}
        {night && (
          <g>
            <circle cx="330" cy="62" r="22" fill="#FFF3C4" />
            <circle cx="320" cy="56" r="20" fill={skyTop} />
            {Array.from({ length: 22 }, (_, i) => (
              <circle
                key={i}
                className="tw-twinkle"
                style={{ animationDelay: `${(i % 7) * 0.4}s` }}
                cx={(i * 67) % 400}
                cy={(i * 41) % 200}
                r={i % 4 === 0 ? 1.8 : 1.1}
                fill="#FFF7E0"
              />
            ))}
          </g>
        )}

        {/* Distant forest */}
        <path d="M0 360 Q60 300 120 340 T240 330 T400 320 V500 H0 Z" fill={night ? "#2A3F4A" : "#B9D8BF"} />
        <path d="M0 420 Q90 370 180 410 T400 390 V500 H0 Z" fill={night ? "#203530" : "#9CC3A8"} />

        {/* Tree: trunk, branches, canopy */}
        <g>
          {tier >= 3 && (
            <g fill={night ? "#244A3E" : "#4C9A7F"}>
              <circle cx="40" cy="150" r="48" />
              <circle cx="362" cy="150" r="48" />
            </g>
          )}
          <g fill={night ? "#2A5C4F" : "#5BA88F"}>
            <circle cx="200" cy="66" r="86" />
            <circle cx="106" cy="98" r="62" />
            <circle cx="294" cy="98" r="62" />
          </g>
          <g fill={night ? "#336B5C" : "#6FBA9C"} opacity="0.9">
            <circle cx="170" cy="40" r="40" />
            <circle cx="250" cy="52" r="34" />
            {tier >= 3 && <circle cx="96" cy="70" r="30" />}
            {tier >= 3 && <circle cx="310" cy="70" r="28" />}
          </g>
          <path d="M162 500 C170 440 172 420 168 380 H232 C228 420 230 440 238 500 Z" fill="url(#tw-bark)" />
          <path d="M150 500 Q160 488 172 480 M250 500 Q240 488 228 480" stroke="#5B3726" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M60 214 Q24 206 4 186" stroke="#7A4D38" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M340 206 Q376 196 398 170" stroke="#7A4D38" strokeWidth="10" strokeLinecap="round" fill="none" />
          <g fill={night ? "#2A5C4F" : "#5BA88F"}>
            <ellipse cx="14" cy="182" rx="14" ry="7" transform="rotate(-30 14 182)" />
            <ellipse cx="386" cy="168" rx="14" ry="7" transform="rotate(30 386 168)" />
          </g>
        </g>

        {/* Tier 4: rope swing + birds */}
        {tier >= 4 && (
          <g>
            <path d="M22 196 V330 M50 206 V330" stroke="#C99A6E" strokeWidth="2.5" />
            <rect x="14" y="328" width="44" height="7" rx="3" fill="#8A5A40" />
            {[0, 1].map((i) => (
              <g key={i} transform={`translate(${366 + i * 18} ${178 - i * 6})`}>
                <ellipse rx="7" ry="5.5" fill={i ? "#F49AC2" : "#6C8FD1"} />
                <circle cx="5" cy="-4" r="4" fill={i ? "#F49AC2" : "#6C8FD1"} />
                <circle cx="6.5" cy="-4.5" r="1" fill="#2B1D16" />
                <path d="M9 -4 l4 1 -4 1z" fill="#F4C34D" />
              </g>
            ))}
          </g>
        )}

        {/* Platform */}
        <path d="M70 412 L172 470 M330 412 L228 470" stroke="#6E432F" strokeWidth="9" strokeLinecap="round" />
        <rect x="26" y="398" width="348" height="16" rx="5" fill="#8A5A40" />
        <rect x="26" y="398" width="348" height="5" rx="2.5" fill="#A06B4C" />

        {/* Tier 2: porch rails + lantern */}
        {tier >= 2 && (
          <g>
            <g stroke="#7A4D38" strokeWidth="4" strokeLinecap="round">
              <path d="M30 398 V366 M44 398 V366 M30 368 H56" />
              <path d="M370 398 V366 M356 398 V366 M344 368 H370" />
            </g>
            <g transform="translate(354 156)">
              <line y2="18" stroke="#5B3726" strokeWidth="1.5" />
              <rect x="-8" y="18" width="16" height="20" rx="5" fill="#F4C779" />
              <rect x="-9" y="15" width="18" height="4" rx="2" fill="#5B3726" />
              <circle cy="28" r={night || tod === "dusk" ? 22 : 0} fill="#FFD98A" opacity="0.25" />
            </g>
          </g>
        )}

        {/* Room interior */}
        <g clipPath="url(#tw-room)">
          {!layout.wallpaper && <rect x="60" y="150" width="280" height="196" fill="#E9D3B3" />}
          {!layout.floor && <rect x="60" y="342" width="280" height="58" fill="#C08D63" />}

          {SLOT_ORDER.filter((s) => s !== "plant_right").map((slot) => (
            <SlotItem key={slot} slot={slot} itemId={layout[slot]} box={boxFor(slot)} reduce={!!reduce} />
          ))}

          {/* Floor/wall seam shading for depth */}
          <rect x="60" y="340" width="280" height="6" fill="#000" opacity="0.08" />

          {night && <rect x="60" y="150" width="280" height="250" fill="#101A3A" opacity={hasGlow ? 0.12 : 0.32} />}
          {hasGlow && (night || tod === "dusk") && <ellipse cx="200" cy="280" rx="170" ry="140" fill="url(#tw-glow)" />}
        </g>

        {/* Room frame + roof */}
        <path d="M60 170 Q60 150 80 150 H320 Q340 150 340 170 V400 H60 Z" fill="none" stroke="#6E432F" strokeWidth="9" />
        <path d="M34 160 L200 62 L366 160 Z" fill="#A65F3F" />
        <path d="M34 160 L200 62 L366 160" fill="none" stroke="#7A3F28" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
        {[0, 1, 2].map((r) => (
          <path key={r} d={`M${70 + r * 34} ${148 - r * 20} H${330 - r * 34}`} stroke="#8F4E33" strokeWidth="3" strokeDasharray="14 6" opacity="0.7" />
        ))}
        <circle cx="200" cy="114" r="15" fill="#6E432F" />
        <circle cx="200" cy="114" r="10" fill={night || tod === "dusk" ? "#FFD98A" : "#F4D6A6"} />

        {/* Tier 3: vines + fireflies */}
        {tier >= 3 && (
          <g>
            <path d="M60 172 Q52 220 62 260 Q54 300 62 340" stroke="#4C9A7F" strokeWidth="3" fill="none" />
            {[190, 228, 262, 300].map((y, i) => (
              <ellipse key={y} cx={i % 2 ? 66 : 56} cy={y} rx="6" ry="3.5" fill="#6FBA9C" transform={`rotate(${i % 2 ? 30 : -30} ${i % 2 ? 66 : 56} ${y})`} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <circle
                key={i}
                className="tw-firefly"
                style={{ animationDelay: `${i * 0.7}s` }}
                cx={30 + ((i * 47) % 340)}
                cy={190 + ((i * 59) % 180)}
                r="2.4"
                fill="#F7E36B"
              />
            ))}
          </g>
        )}

        {/* Porch plant sits outside the room */}
        <SlotItem slot="plant_right" itemId={layout.plant_right} box={SLOT_BOXES.plant_right} reduce={!!reduce} />

        {/* Edit hotspots */}
        {editMode &&
          SLOT_ORDER.map((slot) => {
            const b = boxFor(slot);
            const selected = selectedSlot === slot;
            const big = slot === "wallpaper" || slot === "floor";
            const onKey = (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSlotSelect?.(slot);
              }
            };
            return (
              <g
                key={slot}
                role="button"
                tabIndex={0}
                aria-label={`Change ${SLOT_LABELS[slot]}`}
                aria-pressed={selected}
                onClick={() => onSlotSelect?.(slot)}
                onKeyDown={onKey}
                className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#2AA39C]"
              >
                <rect
                  x={big ? b.x + 6 : b.x - 2}
                  y={slot === "wallpaper" ? b.y + 44 : big ? b.y + 4 : b.y - 2}
                  width={big ? (slot === "wallpaper" ? 30 : 30) : b.w + 4}
                  height={big ? 22 : b.h + 4}
                  rx="8"
                  fill={selected ? "#2AA39C33" : "#ffffff22"}
                  stroke={selected ? "#2AA39C" : "#FFFDF8"}
                  strokeWidth={selected ? 3 : 2}
                  strokeDasharray={selected ? undefined : "5 4"}
                />
                {big ? (
                  <text
                    x={b.x + 21}
                    y={(slot === "wallpaper" ? b.y + 44 : b.y + 4) + 15}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#FFFDF8"
                    stroke="#2F2A24"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {slot === "wallpaper" ? "🧱" : "🪵"}
                  </text>
                ) : (
                  !layout[slot] && (
                    <text
                      x={b.x + b.w / 2}
                      y={b.y + b.h / 2 + 6}
                      textAnchor="middle"
                      fontSize="18"
                      fontWeight="800"
                      fill="#FFFDF8"
                      stroke="#2F2A24"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      +
                    </text>
                  )
                )}
              </g>
            );
          })}
      </svg>

      {/* Pip (HTML layer so the art can be any image and he can talk) */}
      <div
        className={cn("absolute transition-opacity", editMode && "pointer-events-none opacity-50")}
        style={{ left: "42%", top: "57%", width: "23.5%", height: "22.4%" }}
      >
        <Pip pose={pipPose} fill interactive={interactivePip && !editMode} />
      </div>
    </div>
  );
}

function SlotItem({ slot, itemId, box, reduce }: { slot: RoomSlot; itemId?: string; box: Box; reduce: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {itemId && (
        <g key={itemId} data-slot={slot} data-item={itemId} transform={`translate(${box.x} ${box.y})`}>
          <motion.g
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          >
            <ItemGraphic itemId={itemId} w={box.w} h={box.h} />
          </motion.g>
        </g>
      )}
    </AnimatePresence>
  );
}

/** Renders an item's art inside a w×h box (SVG <g>). */
export function ItemGraphic({ itemId, w, h }: { itemId: string; w: number; h: number }) {
  const art = ITEM_ART[itemId];
  if (!art) return <rect width={w} height={h} rx={6} fill="#E6DECE" />;
  if (typeof art === "string") return <image href={art} width={w} height={h} preserveAspectRatio="xMidYMax meet" />;
  const Art = art;
  return <Art w={w} h={h} />;
}
