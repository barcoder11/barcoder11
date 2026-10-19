/**
 * Decoration artwork registry.
 *
 * Each entry draws an item inside its slot box (see slots.ts) using local
 * coordinates: (0,0) is the top-left of the box, (w,h) the bottom-right.
 *
 * To replace an item with illustrated or 3D-rendered art, set its entry to
 * an image URL instead, e.g.  "quilt-bed": "/items/quilt-bed.png"
 * The image is stretched to the slot box, so export it at that aspect ratio.
 */
import type { JSX } from "react";

type ArtProps = { w: number; h: number };
export type ItemArt = ((p: ArtProps) => JSX.Element) | string;

/** Round so server and browser render identical numbers (avoids hydration diffs). */
const r2 = (n: number) => Math.round(n * 100) / 100;

const Shadow = ({ w, h, inset = 4 }: ArtProps & { inset?: number }) => (
  <ellipse cx={w / 2} cy={h - 2} rx={w / 2 - inset} ry={4} fill="#000" opacity={0.14} />
);

const pot = (w: number, h: number, color = "#C9744E", rim = "#A85C3B") => (
  <g>
    <path d={`M${w * 0.18} ${h * 0.62} L${w * 0.82} ${h * 0.62} L${w * 0.72} ${h - 3} L${w * 0.28} ${h - 3} Z`} fill={color} />
    <rect x={w * 0.12} y={h * 0.58} width={w * 0.76} height={h * 0.1} rx={2} fill={rim} />
  </g>
);

export const ITEM_ART: Record<string, ItemArt> = {
  // ---------------------------------------------------------------- walls
  "plank-walls": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#D7AE82" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={(w / 9) * i} width={w / 9 - 1.5} height={h} fill={i % 2 ? "#D2A87B" : "#DCB68B"} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={`k${i}`} cx={(w / 9) * i + 8} cy={(i * 37) % h} r={1.6} fill="#A97C55" opacity={0.6} />
      ))}
    </g>
  ),
  "sage-stripes": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#E4F0E6" />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={(w / 14) * i} width={w / 28} height={h} fill="#C6DECB" />
      ))}
      <rect y={h - 26} width={w} height={26} fill="#9CC3A8" />
      <rect y={h - 28} width={w} height={4} fill="#7FAE8E" />
    </g>
  ),
  "honey-dots": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#FBEBD0" />
      {Array.from({ length: 70 }, (_, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        return <circle key={i} cx={col * 30 + (row % 2 ? 15 : 0) + 6} cy={row * 30 + 10} r={4} fill="#EDC27D" />;
      })}
    </g>
  ),
  "starry-walls": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#2D3A66" />
      {Array.from({ length: 36 }, (_, i) => (
        <path
          key={i}
          transform={`translate(${(i * 53) % w} ${(i * 31) % h}) scale(${0.5 + (i % 3) * 0.25})`}
          d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
          fill="#F4D6A6"
          opacity={0.9}
        />
      ))}
    </g>
  ),
  "wood-floor": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#B9855C" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} y={(h / 5) * i} width={w} height={h / 5 - 1.5} fill={i % 2 ? "#B07D55" : "#C08D63"} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`s${i}`} x={(i * 71) % w} y={(h / 5) * (i % 5)} width={1.5} height={h / 5} fill="#946545" />
      ))}
    </g>
  ),
  "moss-floor": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#7FAE6E" />
      {Array.from({ length: 40 }, (_, i) => (
        <ellipse key={i} cx={(i * 37) % w} cy={(i * 13) % h} rx={9} ry={4} fill={i % 2 ? "#8DBD7B" : "#6F9E60"} />
      ))}
    </g>
  ),
  "checker-floor": ({ w, h }) => (
    <g>
      <rect width={w} height={h} fill="#FBF1DD" />
      {Array.from({ length: 14 * 3 }, (_, i) => {
        const c = i % 14;
        const r = Math.floor(i / 14);
        return (c + r) % 2 ? <rect key={i} x={(w / 14) * c} y={(h / 3) * r} width={w / 14} height={h / 3} fill="#EBC584" /> : null;
      })}
    </g>
  ),

  // --------------------------------------------------------------- window
  "round-window": ({ w, h }) => (
    <g>
      <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill="#7A4D38" />
      <circle cx={w / 2} cy={h / 2} r={w / 2 - 9} fill="url(#tw-window-sky)" />
      <path d={`M${w / 2} 9 V${h - 9} M9 ${h / 2} H${w - 9}`} stroke="#7A4D38" strokeWidth={5} />
      <circle cx={w / 2 - 14} cy={h / 2 - 14} r={6} fill="#fff" opacity={0.35} />
    </g>
  ),
  "flower-window": ({ w, h }) => (
    <g>
      <rect x={6} y={2} width={w - 12} height={h - 22} rx={10} fill="#7A4D38" />
      <rect x={13} y={9} width={w - 26} height={h - 36} rx={6} fill="url(#tw-window-sky)" />
      <path d={`M${w / 2} 9 V${h - 27}`} stroke="#7A4D38" strokeWidth={5} />
      <rect x={2} y={h - 24} width={w - 4} height={16} rx={4} fill="#A85C3B" />
      {[12, 24, 36, 48, 60, 72].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={h - 26} r={5} fill={["#E86F7E", "#F4C34D", "#F49AC2"][i % 3]} />
          <circle cx={x} cy={h - 26} r={2} fill="#FFF3C4" />
        </g>
      ))}
    </g>
  ),
  "stained-window": ({ w, h }) => (
    <g>
      <path d={`M6 ${h - 2} V${h / 2} A${w / 2 - 6} ${w / 2 - 6} 0 0 1 ${w - 6} ${h / 2} V${h - 2} Z`} fill="#5B3726" />
      <path d={`M12 ${h - 8} V${h / 2} A${w / 2 - 12} ${w / 2 - 12} 0 0 1 ${w - 12} ${h / 2} V${h - 8} Z`} fill="#F4D6A6" />
      <g opacity={0.9}>
        <path d={`M12 ${h / 2} H${w / 2} V${h - 8} H12 Z`} fill="#6C8FD1" />
        <path d={`M${w / 2} ${h / 2} H${w - 12} V${h - 8} H${w / 2} Z`} fill="#5BA88F" />
        <path d={`M12 ${h / 2} A${w / 2 - 12} ${w / 2 - 12} 0 0 1 ${w / 2} 12 V${h / 2} Z`} fill="#E86F7E" />
        <path d={`M${w / 2} 12 A${w / 2 - 12} ${w / 2 - 12} 0 0 1 ${w - 12} ${h / 2} H${w / 2} Z`} fill="#F4C34D" />
      </g>
      <path d={`M${w / 2} 12 V${h - 8} M12 ${h / 2} H${w - 12}`} stroke="#5B3726" strokeWidth={3} />
      <circle cx={w / 2} cy={h / 2} r={9} fill="#F4D6A6" stroke="#5B3726" strokeWidth={3} />
    </g>
  ),

  // ------------------------------------------------------------- wall art
  "acorn-poster": ({ w, h }) => (
    <g>
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={3} fill="#FFF7E6" stroke="#7A4D38" strokeWidth={4} />
      <ellipse cx={w / 2} cy={h / 2 + 4} rx={10} ry={12} fill="#B9774E" />
      <path d={`M${w / 2 - 13} ${h / 2 - 3} Q${w / 2} ${h / 2 - 16} ${w / 2 + 13} ${h / 2 - 3} Z`} fill="#6E432F" />
      <rect x={w / 2 - 1.5} y={h / 2 - 16} width={3} height={6} fill="#6E432F" />
    </g>
  ),
  "pip-portrait": ({ w, h }) => (
    <g>
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 3} ry={h / 2 - 2} fill="#E8B86A" stroke="#A97C2F" strokeWidth={3} />
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 10} ry={h / 2 - 9} fill="#D7E9DB" />
      <ellipse cx={w / 2} cy={h / 2 + 15} rx={14} ry={9} fill="#2AA39C" />
      <circle cx={w / 2 - 9} cy={h / 2 - 10} r={5} fill="#7A4D38" />
      <circle cx={w / 2 + 9} cy={h / 2 - 10} r={5} fill="#7A4D38" />
      <circle cx={w / 2} cy={h / 2 - 1} r={11} fill="#9C6A4B" />
      <circle cx={w / 2 - 4} cy={h / 2 - 3} r={1.8} fill="#2B1D16" />
      <circle cx={w / 2 + 4} cy={h / 2 - 3} r={1.8} fill="#2B1D16" />
      <ellipse cx={w / 2} cy={h / 2 + 3} rx={5} ry={3.5} fill="#F0D2AE" />
    </g>
  ),
  "forest-map": ({ w, h }) => (
    <g>
      <rect x={2} y={6} width={w - 4} height={h - 12} rx={2} fill="#F3E3C2" stroke="#7A4D38" strokeWidth={3} />
      <path d={`M10 ${h - 16} Q${w / 3} ${h / 2} ${w / 2} ${h - 20} T${w - 10} 18`} stroke="#C4513F" strokeWidth={2} strokeDasharray="3 3" fill="none" />
      {[
        [14, 18],
        [w - 22, h - 22],
        [w / 2 - 6, 16],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y + 10} L${x + 6} ${y} L${x + 12} ${y + 10} Z`} fill="#5BA88F" />
      ))}
      <path d={`M${w - 16} 14 l3 3 m0 -3 l-3 3`} stroke="#C4513F" strokeWidth={2} />
    </g>
  ),

  // ---------------------------------------------------------------- shelf
  "plank-shelf": ({ w, h }) => (
    <g>
      <rect x={4} y={h - 10} width={w - 8} height={8} rx={2} fill="#8A5A40" />
      <path d={`M12 ${h - 2} l8 8 M${w - 12} ${h - 2} l-8 8`} stroke="#6E432F" strokeWidth={3} />
      <ellipse cx={24} cy={h - 16} rx={7} ry={7} fill="#B9774E" />
      <path d={`M16 ${h - 20} Q24 ${h - 30} 32 ${h - 20} Z`} fill="#6E432F" />
      <rect x={w - 34} y={h - 26} width={16} height={16} rx={3} fill="#D7E9DB" />
    </g>
  ),
  "book-shelf": ({ w, h }) => (
    <g>
      <rect x={2} y={h - 10} width={w - 4} height={8} rx={2} fill="#8A5A40" />
      {["#C4513F", "#397A69", "#E8B86A", "#6C8FD1", "#D9727B", "#5BA88F", "#7A4D38"].map((c, i) => (
        <rect key={c} x={10 + i * 9} y={h - 10 - (24 + (i % 3) * 4)} width={8} height={24 + (i % 3) * 4} rx={1.5} fill={c} />
      ))}
      <rect x={76} y={h - 18} width={18} height={8} rx={1.5} fill="#F4D6A6" />
    </g>
  ),
  "trophy-shelf": ({ w, h }) => (
    <g>
      <rect x={2} y={h - 10} width={w - 4} height={8} rx={2} fill="#8A5A40" />
      {[18, 50, 82].map((x, i) => (
        <g key={x} transform={`translate(${x - 10} ${h - 36 + (i === 1 ? -4 : 0)})`}>
          <path d="M2 0 H18 V8 Q18 16 10 17 Q2 16 2 8 Z" fill="#F4C34D" />
          <path d="M2 3 Q-4 4 2 11 M18 3 Q24 4 18 11" stroke="#E0A92E" strokeWidth={2} fill="none" />
          <rect x={8} y={17} width={4} height={5} fill="#E0A92E" />
          <rect x={4} y={22} width={12} height={4} rx={1} fill="#7A4D38" />
        </g>
      ))}
    </g>
  ),

  // --------------------------------------------------------------- lights
  "string-lights": ({ w }) => (
    <g>
      <path d={`M0 6 Q${w / 4} 26 ${w / 2} 8 T${w} 6`} stroke="#5B3726" strokeWidth={1.5} fill="none" />
      {Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        const x = r2(t * w);
        const y = r2(6 + Math.sin(t * Math.PI * 2) * 9 + 4);
        return <circle key={i} className="tw-twinkle" style={{ animationDelay: `${i * 0.2}s` }} cx={x} cy={y + 3} r={3.4} fill={["#F4C34D", "#F49AC2", "#9BE0D6"][i % 3]} />;
      })}
    </g>
  ),
  "paper-lanterns": ({ w }) => (
    <g>
      <path d={`M0 4 Q${w / 2} 16 ${w} 4`} stroke="#5B3726" strokeWidth={1.5} fill="none" />
      {[0.18, 0.5, 0.82].map((t) => (
        <g key={t} transform={`translate(${r2(t * w)} ${r2(8 + Math.sin(t * Math.PI) * 5)})`}>
          <line y2={6} stroke="#5B3726" />
          <ellipse cy={18} rx={11} ry={13} fill="#F4C779" />
          <ellipse cy={18} rx={6} ry={13} fill="#F9DDA2" opacity={0.7} />
          <rect x={-5} y={4} width={10} height={3} rx={1} fill="#7A4D38" />
          <rect x={-5} y={29} width={10} height={3} rx={1} fill="#7A4D38" />
        </g>
      ))}
    </g>
  ),
  "firefly-jars": ({ w }) => (
    <g>
      {[0.25, 0.75].map((t) => (
        <g key={t} transform={`translate(${t * w - 10} 0)`}>
          <line x1={10} y2={12} x2={10} stroke="#5B3726" strokeWidth={1.5} />
          <rect x={1} y={12} width={18} height={22} rx={6} fill="#D7E9DB" opacity={0.55} stroke="#9CC3A8" />
          <rect x={3} y={9} width={14} height={4} rx={1.5} fill="#7A4D38" />
          {[0, 1, 2].map((i) => (
            <circle key={i} className="tw-twinkle" style={{ animationDelay: `${i * 0.5 + t}s` }} cx={6 + i * 4} cy={20 + (i % 2) * 6} r={2} fill="#F7E36B" />
          ))}
        </g>
      ))}
    </g>
  ),

  // ------------------------------------------------------------------ bed
  "leaf-bed": ({ w, h }) => (
    <g>
      <Shadow w={w} h={h} />
      <ellipse cx={w / 2} cy={h - 18} rx={w / 2 - 6} ry={16} fill="#6E9E5E" />
      {[-34, -14, 6, 26].map((dx, i) => (
        <ellipse key={dx} cx={w / 2 + dx} cy={h - 26} rx={18} ry={9} transform={`rotate(${i * 12 - 18} ${w / 2 + dx} ${h - 26})`} fill={i % 2 ? "#8DBD7B" : "#9CC98A"} />
      ))}
      <ellipse cx={w / 2 - 30} cy={h - 34} rx={16} ry={8} fill="#F3E3C2" />
    </g>
  ),
  "quilt-bed": ({ w, h }) => (
    <g>
      <Shadow w={w} h={h} />
      <rect x={4} y={14} width={12} height={h - 18} rx={4} fill="#7A4D38" />
      <rect x={w - 12} y={36} width={10} height={h - 40} rx={4} fill="#7A4D38" />
      <rect x={8} y={h - 46} width={w - 12} height={28} rx={8} fill="#F3E3C2" />
      <rect x={16} y={h - 58} width={30} height={16} rx={8} fill="#FFFDF8" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={46 + (i % 5) * 13} y={h - 50 + Math.floor(i / 5) * 13} width={13} height={13} fill={["#D9727B", "#F4D6A6", "#5BA88F", "#6C8FD1", "#E8B86A"][(i + Math.floor(i / 5)) % 5]} />
      ))}
      <rect x={44} y={h - 24} width={w - 50} height={8} rx={3} fill="#C4513F" opacity={0.75} />
      <rect x={6} y={h - 18} width={w - 10} height={8} rx={3} fill="#8A5A40" />
    </g>
  ),
  hammock: ({ w, h }) => (
    <g>
      <rect x={4} y={10} width={8} height={h - 12} rx={3} fill="#7A4D38" />
      <rect x={w - 12} y={10} width={8} height={h - 12} rx={3} fill="#7A4D38" />
      <path d={`M10 22 Q${w / 2} ${h + 8} ${w - 10} 22`} stroke="#E8B86A" strokeWidth={3} fill="none" />
      <path d={`M10 22 Q${w / 2} ${h - 6} ${w - 10} 22 Q${w / 2} ${h - 22} 10 22 Z`} fill="#2AA39C" />
      <path d={`M24 34 Q${w / 2} ${h - 18} ${w - 24} 34`} stroke="#F4D6A6" strokeWidth={2} strokeDasharray="4 4" fill="none" />
      <ellipse cx={30} cy={36} rx={12} ry={7} fill="#FFFDF8" />
      <Shadow w={w} h={h} inset={18} />
    </g>
  ),

  // ------------------------------------------------------------------ rug
  "round-rug": ({ w, h }) => (
    <g>
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 4} ry={h / 2 - 2} fill="#D9727B" />
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 16} ry={h / 2 - 7} fill="#F2A7AE" />
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 34} ry={h / 2 - 11} fill="#F8D0D3" />
    </g>
  ),
  "mushroom-rug": ({ w, h }) => (
    <g>
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 4} ry={h / 2 - 2} fill="#C4513F" />
      {[
        [0.3, 0.45],
        [0.55, 0.3],
        [0.72, 0.6],
        [0.42, 0.7],
        [0.18, 0.55],
        [0.85, 0.42],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x * w} cy={y * h} rx={8} ry={4} fill="#FFF7E6" />
      ))}
    </g>
  ),
  "cloud-rug": ({ w, h }) => (
    <g fill="#FFFDF8" stroke="#D7E9DB" strokeWidth={2}>
      <ellipse cx={w * 0.3} cy={h * 0.55} rx={w * 0.22} ry={h * 0.4} />
      <ellipse cx={w * 0.55} cy={h * 0.45} rx={w * 0.26} ry={h * 0.45} />
      <ellipse cx={w * 0.75} cy={h * 0.6} rx={w * 0.2} ry={h * 0.36} />
    </g>
  ),

  // ----------------------------------------------------------------- desk
  "stump-desk": ({ w, h }) => (
    <g>
      <Shadow w={w} h={h} />
      <path d={`M14 32 L${w - 14} 32 L${w - 10} ${h - 4} L10 ${h - 4} Z`} fill="#8A5A40" />
      {[22, 36, 50].map((x) => (
        <path key={x} d={`M${x} 40 V${h - 8}`} stroke="#6E432F" strokeWidth={2} opacity={0.6} />
      ))}
      <ellipse cx={w / 2} cy={32} rx={w / 2 - 12} ry={9} fill="#D7AE82" />
      <ellipse cx={w / 2} cy={32} rx={w / 2 - 22} ry={5} fill="none" stroke="#B9855C" strokeWidth={1.5} />
    </g>
  ),
  "study-desk": ({ w, h }) => (
    <g>
      <Shadow w={w} h={h} />
      <rect x={2} y={28} width={w - 4} height={9} rx={3} fill="#A06B4C" />
      <rect x={6} y={37} width={7} height={h - 40} rx={2} fill="#7A4D38" />
      <rect x={w - 30} y={37} width={24} height={h - 40} rx={3} fill="#8A5A40" />
      <rect x={w - 26} y={48} width={16} height={10} rx={2} fill="#A06B4C" />
      <circle cx={w - 18} cy={53} r={1.6} fill="#F4D6A6" />
      <rect x={10} y={18} width={22} height={10} rx={1.5} fill="#6C8FD1" />
      <rect x={12} y={12} width={18} height={6} rx={1.5} fill="#E86F7E" />
    </g>
  ),

  // ----------------------------------------------------------------- lamp
  candle: ({ w, h }) => (
    <g>
      <ellipse cx={w / 2} cy={h - 4} rx={10} ry={3} fill="#E8B86A" />
      <rect x={w / 2 - 5} y={h - 20} width={10} height={16} rx={2} fill="#FFF3D6" />
      <path className="tw-flicker" d={`M${w / 2} ${h - 32} Q${w / 2 + 5} ${h - 24} ${w / 2} ${h - 21} Q${w / 2 - 5} ${h - 24} ${w / 2} ${h - 32} Z`} fill="#F7B34D" />
    </g>
  ),
  "mushroom-lamp": ({ w, h }) => (
    <g>
      <rect x={w / 2 - 4} y={h - 18} width={8} height={16} rx={3} fill="#FFF3D6" />
      <path d={`M2 ${h - 16} Q${w / 2} -2 ${w - 2} ${h - 16} Z`} fill="#E86F7E" />
      <circle cx={w / 2 - 5} cy={h - 26} r={2.4} fill="#FFF7E6" />
      <circle cx={w / 2 + 6} cy={h - 22} r={2} fill="#FFF7E6" />
      <ellipse cx={w / 2} cy={h - 2} rx={9} ry={2.5} fill="#000" opacity={0.15} />
    </g>
  ),
  "moon-lamp": ({ w, h }) => (
    <g>
      <rect x={w / 2 - 6} y={h - 7} width={12} height={5} rx={2} fill="#7A4D38" />
      <circle cx={w / 2} cy={h - 20} r={12} fill="#FFF3C4" />
      <circle cx={w / 2 - 4} cy={h - 23} r={2.5} fill="#F2DE9E" />
      <circle cx={w / 2 + 4} cy={h - 16} r={1.8} fill="#F2DE9E" />
    </g>
  ),

  // --------------------------------------------------------------- plants
  "sprout-pot": ({ w, h }) => (
    <g>
      {pot(w, h)}
      <path d={`M${w / 2} ${h * 0.6} V${h * 0.42}`} stroke="#5BA88F" strokeWidth={2.5} />
      <ellipse cx={w / 2 - 5} cy={h * 0.42} rx={6} ry={3.5} fill="#7FC28E" transform={`rotate(-25 ${w / 2 - 5} ${h * 0.42})`} />
      <ellipse cx={w / 2 + 5} cy={h * 0.4} rx={6} ry={3.5} fill="#8DD09B" transform={`rotate(25 ${w / 2 + 5} ${h * 0.4})`} />
    </g>
  ),
  fern: ({ w, h }) => (
    <g>
      {[-40, -20, 0, 20, 40].map((r) => (
        <ellipse key={r} cx={w / 2} cy={h * 0.35} rx={5} ry={h * 0.3} fill={r % 40 ? "#5BA88F" : "#4C9A7F"} transform={`rotate(${r} ${w / 2} ${h * 0.62})`} />
      ))}
      {pot(w, h, "#D7AE82", "#B9855C")}
    </g>
  ),
  monstera: ({ w, h }) => (
    <g>
      {[
        [-28, "#3E8E6E"],
        [0, "#4C9A7F"],
        [28, "#3E8E6E"],
      ].map(([r, c]) => (
        <g key={r as number} transform={`rotate(${r} ${w / 2} ${h * 0.62})`}>
          <path d={`M${w / 2} ${h * 0.62} V${h * 0.25}`} stroke="#397A69" strokeWidth={2} />
          <ellipse cx={w / 2} cy={h * 0.2} rx={11} ry={13} fill={c as string} />
          <path d={`M${w / 2} ${h * 0.1} V${h * 0.3} M${w / 2 - 8} ${h * 0.18} L${w / 2} ${h * 0.22}`} stroke="#2A5C4F" strokeWidth={1.2} />
        </g>
      ))}
      {pot(w, h, "#FFFDF8", "#E6DECE")}
    </g>
  ),
  cactus: ({ w, h }) => (
    <g>
      <rect x={w / 2 - 6} y={h * 0.3} width={12} height={h * 0.34} rx={6} fill="#6FB07E" />
      <path d={`M${w / 2 - 6} ${h * 0.48} H${w / 2 - 12} V${h * 0.38}`} stroke="#6FB07E" strokeWidth={5} strokeLinecap="round" fill="none" />
      <circle cx={w / 2} cy={h * 0.29} r={3} fill="#F49AC2" />
      {pot(w, h)}
    </g>
  ),
  succulents: ({ w, h }) => (
    <g>
      {[w * 0.25, w * 0.5, w * 0.75].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy={h * 0.56} rx={6} ry={5} fill={["#8CC3A0", "#A3CF9F", "#7DB7A4"][i]} />
          <ellipse cx={x} cy={h * 0.52} rx={3} ry={3} fill="#C7E6C4" />
        </g>
      ))}
      <rect x={2} y={h * 0.6} width={w - 4} height={h * 0.38} rx={4} fill="#C9744E" />
    </g>
  ),
  bonsai: ({ w, h }) => (
    <g>
      <path d={`M${w / 2} ${h * 0.64} Q${w / 2 - 6} ${h * 0.45} ${w / 2 + 4} ${h * 0.3}`} stroke="#7A4D38" strokeWidth={4} fill="none" />
      <ellipse cx={w / 2 + 6} cy={h * 0.22} rx={14} ry={8} fill="#4C9A7F" />
      <ellipse cx={w / 2 - 8} cy={h * 0.34} rx={10} ry={6} fill="#5BA88F" />
      <rect x={4} y={h * 0.64} width={w - 8} height={h * 0.18} rx={3} fill="#6C8FD1" />
    </g>
  ),
};
