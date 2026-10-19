import { useId } from "react";
import type { AnimalColors, PlaceholderStyle } from "@/lib/types";

export type PetState = "idle" | "happy" | "comforted" | "snacking" | "playing" | "resting";

const DEFAULTS: Record<PlaceholderStyle, Required<AnimalColors>> = {
  raccoon: { fur: "#8B5A3C", mask: "#3B2A25", accent: "#F3E3C3", belly: "#D9B48F" },
  otter: { fur: "#6B4A33", mask: "#4A3324", accent: "#E9D7BF", belly: "#CDB497" },
  penguin: { fur: "#24303A", mask: "#24303A", accent: "#F6C445", belly: "#F8F6F0" },
  fox: { fur: "#D46A2E", mask: "#F5E6D3", accent: "#FFFFFF", belly: "#F5E6D3" },
  squirrel: { fur: "#B5562B", mask: "#B5562B", accent: "#F2DDC1", belly: "#F2DDC1" },
  generic: { fur: "#9C7A5B", mask: "#5E4634", accent: "#F1E2CC", belly: "#E2C9A8" },
};

/**
 * Placeholder character art (stylised SVG) with animation states.
 * Replaced automatically by official uploaded art when an asset exists for the state.
 */
type CritterProps = {
  variant: PlaceholderStyle;
  colors?: AnimalColors;
  state?: PetState;
  title: string;
  className?: string;
};

export function Critter(props: CritterProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return <CritterSvg {...props} uid={uid} />;
}

/** Hook-free version (used for server-side image generation). */
export function CritterSvg({ variant, colors, state = "idle", title, className = "", uid }: CritterProps & { uid: string }) {
  const c = { ...DEFAULTS[variant], ...(colors ?? {}) };
  const isPenguin = variant === "penguin";
  const eyesClosed = state === "resting";
  const blush = state === "happy" || state === "comforted" || state === "snacking" ? 0.75 : 0.35;
  const furGrad = `fur-${uid}`;
  const tailClip = `tail-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`pet pet-${state} ${state === "idle" ? "pet-idle" : ""} overflow-visible ${className}`}
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id={furGrad} cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor={lighten(c.fur, 0.18)} />
          <stop offset="100%" stopColor={c.fur} />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="190" rx="58" ry="8" fill="#183027" opacity="0.14" />

      <g className="pet-body-group">
        {/* ---------------- tail (behind body) */}
        {variant === "raccoon" && (
          <g className="pet-tail">
            <clipPath id={tailClip}>
              <path d="M132 168 C170 168 186 132 176 100 C172 86 158 84 156 98 C154 116 150 140 122 150 Z" />
            </clipPath>
            <path d="M132 168 C170 168 186 132 176 100 C172 86 158 84 156 98 C154 116 150 140 122 150 Z" fill={c.fur} />
            <g clipPath={`url(#${tailClip})`} fill={c.mask}>
              <rect x="120" y="92" width="80" height="9" transform="rotate(-20 160 96)" />
              <rect x="120" y="112" width="80" height="9" transform="rotate(-25 160 116)" />
              <rect x="115" y="134" width="80" height="9" transform="rotate(-35 155 138)" />
              <rect x="110" y="156" width="80" height="9" transform="rotate(-45 150 160)" />
            </g>
          </g>
        )}
        {variant === "fox" && (
          <g className="pet-tail">
            <path d="M128 170 C176 176 192 128 170 96 C164 120 150 140 120 150 Z" fill={c.fur} />
            <path d="M170 96 C176 104 180 116 178 126 C170 120 166 108 170 96 Z" fill={c.accent} />
          </g>
        )}
        {variant === "squirrel" && (
          <g className="pet-tail">
            <path d="M126 168 C168 170 190 120 168 76 C156 52 124 56 128 82 C132 100 160 100 150 128 C146 140 136 146 122 150 Z" fill={c.fur} />
            <path d="M150 70 C162 76 168 92 162 104" stroke={lighten(c.fur, 0.25)} strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
        )}
        {variant === "otter" && (
          <path className="pet-tail" d="M132 176 C160 182 182 178 196 168 C180 186 150 192 128 186 Z" fill={c.fur} />
        )}
        {variant === "generic" && (
          <path className="pet-tail" d="M134 168 C160 170 172 150 166 134 C158 146 146 152 126 152 Z" fill={c.fur} />
        )}

        {/* ---------------- body */}
        <ellipse cx="100" cy="146" rx={isPenguin ? 44 : 50} ry={isPenguin ? 46 : 42} fill={`url(#${furGrad})`} />
        <ellipse cx="100" cy={isPenguin ? 150 : 154} rx={isPenguin ? 32 : 29} ry={isPenguin ? 38 : 28} fill={c.belly} />

        {/* feet */}
        <ellipse cx="80" cy="185" rx="14" ry="7" fill={isPenguin ? "#F2A341" : darken(c.fur, 0.25)} />
        <ellipse cx="120" cy="185" rx="14" ry="7" fill={isPenguin ? "#F2A341" : darken(c.fur, 0.25)} />

        {/* arms / flippers */}
        {state === "snacking" ? (
          <>
            <ellipse cx="88" cy="122" rx="9" ry="12" fill={isPenguin ? c.fur : darken(c.fur, 0.12)} transform="rotate(25 88 122)" />
            <ellipse cx="112" cy="122" rx="9" ry="12" fill={isPenguin ? c.fur : darken(c.fur, 0.12)} transform="rotate(-25 112 122)" />
            <circle cx="100" cy="116" r="8" fill="#5B3A8C" />
            <circle cx="97" cy="113" r="2" fill="#ffffff" opacity="0.7" />
            <path d="M100 108 l2 -5" stroke="#3E7C4F" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : isPenguin ? (
          <>
            <path d="M58 132 C46 150 50 168 62 170 C64 156 66 144 64 132 Z" fill={c.fur} />
            <path d="M142 132 C154 150 150 168 138 170 C136 156 134 144 136 132 Z" fill={c.fur} />
          </>
        ) : (
          <>
            <ellipse cx="70" cy="154" rx="10" ry="14" fill={darken(c.fur, 0.12)} />
            <ellipse cx="130" cy="154" rx="10" ry="14" fill={darken(c.fur, 0.12)} />
          </>
        )}

        {/* ---------------- head */}
        <g className={`pet-head ${state === "idle" ? "pet-head-look" : ""}`}>
          <Ears variant={variant} c={c} />
          <ellipse cx="100" cy="88" rx={isPenguin ? 40 : 46} ry={isPenguin ? 38 : 40} fill={`url(#${furGrad})`} />

          {variant === "raccoon" && (
            <>
              <path d="M62 96 C66 112 84 120 100 120 C116 120 134 112 138 96 C130 104 116 108 100 108 C84 108 70 104 62 96 Z" fill={c.accent} />
              <path d="M58 84 C66 70 86 76 100 82 C114 76 134 70 142 84 C138 98 122 100 112 94 C106 92 94 92 88 94 C78 100 62 98 58 84 Z" fill={c.mask} />
              <path d="M70 66 C80 62 92 64 100 70 C108 64 120 62 130 66" stroke={c.accent} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9" />
              {/* Maple's tiny cream forehead spot */}
              <ellipse cx="100" cy="60" rx="5" ry="4" fill={c.accent} />
            </>
          )}
          {(variant === "fox" || variant === "otter" || variant === "squirrel" || variant === "generic") && (
            <path d="M68 98 C72 114 86 122 100 122 C114 122 128 114 132 98 C122 106 112 108 100 108 C88 108 78 106 68 98 Z" fill={c.accent} />
          )}
          {isPenguin && <ellipse cx="100" cy="96" rx="30" ry="26" fill={c.belly} />}

          {/* eyes */}
          {eyesClosed ? (
            <>
              <path d="M75 88 q7 6 14 0" stroke="#183027" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M111 88 q7 6 14 0" stroke="#183027" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="82" cy="87" r="7.5" fill="#183027" />
              <circle cx="118" cy="87" r="7.5" fill="#183027" />
              <circle cx="84.5" cy="84" r="2.6" fill="#ffffff" />
              <circle cx="120.5" cy="84" r="2.6" fill="#ffffff" />
              <circle cx="80" cy="90" r="1.2" fill="#ffffff" opacity="0.8" />
              <circle cx="116" cy="90" r="1.2" fill="#ffffff" opacity="0.8" />
              <ellipse className="pet-eyelid" cx="82" cy="87" rx="9" ry="9" fill={variant === "raccoon" ? c.mask : c.fur} />
              <ellipse className="pet-eyelid" cx="118" cy="87" rx="9" ry="9" fill={variant === "raccoon" ? c.mask : c.fur} />
            </>
          )}

          {/* nose / beak */}
          {isPenguin ? (
            <path d="M92 100 L108 100 L100 110 Z" fill="#F2A341" />
          ) : (
            <>
              <ellipse cx="100" cy="102" rx="6.5" ry="4.8" fill="#183027" />
              <ellipse cx="98" cy="100.5" rx="2" ry="1.2" fill="#ffffff" opacity="0.6" />
              <path
                d={state === "happy" || state === "comforted" || state === "playing" ? "M92 108 q4 6 8 0 q4 6 8 0" : "M94 108 q3 3 6 0 q3 3 6 0"}
                stroke="#183027"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
            </>
          )}
          {variant === "otter" && (
            <g stroke="#183027" strokeWidth="1.2" opacity="0.5" strokeLinecap="round">
              <path d="M86 104 l-16 -2" />
              <path d="M86 107 l-15 3" />
              <path d="M114 104 l16 -2" />
              <path d="M114 107 l15 3" />
            </g>
          )}

          <circle cx="70" cy="100" r="6" fill="#F28B82" opacity={blush} />
          <circle cx="130" cy="100" r="6" fill="#F28B82" opacity={blush} />
        </g>
      </g>

      {/* ---------------- state overlays */}
      {(state === "comforted" || state === "happy") && (
        <g fill="#E8577A">
          <Heart x={56} y={52} delay="0s" />
          <Heart x={142} y={44} delay="0.35s" />
          <Heart x={100} y={30} delay="0.7s" />
        </g>
      )}
      {state === "resting" && (
        <g fill="#2F6B58" fontFamily="var(--font-display)" fontWeight="700">
          <text x="140" y="56" fontSize="18" className="zzz">z</text>
          <text x="152" y="40" fontSize="14" className="zzz" style={{ animationDelay: "0.8s" }}>z</text>
          <text x="160" y="26" fontSize="11" className="zzz" style={{ animationDelay: "1.6s" }}>z</text>
        </g>
      )}
      {state === "playing" && (
        <g className="ball-bounce">
          <circle cx="160" cy="176" r="12" fill="#E8577A" />
          <path d="M148 176 q12 -8 24 0" stroke="#FFF8EC" strokeWidth="3" fill="none" />
        </g>
      )}
      {state === "snacking" && (
        <g fill="#EDBC78">
          <circle cx="62" cy="70" r="3" className="sparkle" />
          <circle cx="142" cy="64" r="2.5" className="sparkle" style={{ animationDelay: "0.6s" }} />
        </g>
      )}
    </svg>
  );
}

function Ears({ variant, c }: { variant: PlaceholderStyle; c: Required<AnimalColors> }) {
  switch (variant) {
    case "penguin":
      return null;
    case "raccoon":
      return (
        <>
          <path d="M60 70 C54 46 62 34 70 36 C80 40 86 52 86 60 Z" fill={c.fur} />
          <path d="M140 70 C146 46 138 34 130 36 C120 40 114 52 114 60 Z" fill={c.fur} />
          <path d="M66 62 C64 50 68 44 72 45 C77 48 80 54 80 59 Z" fill={c.accent} />
          <path d="M134 62 C136 50 132 44 128 45 C123 48 120 54 120 59 Z" fill={c.accent} />
        </>
      );
    case "fox":
      return (
        <>
          <path d="M60 72 L64 26 L92 58 Z" fill={c.fur} />
          <path d="M140 72 L136 26 L108 58 Z" fill={c.fur} />
          <path d="M64 26 L70 40 L60 44 Z" fill="#3B2A25" />
          <path d="M136 26 L130 40 L140 44 Z" fill="#3B2A25" />
          <path d="M68 62 L68 40 L84 58 Z" fill={c.accent} />
          <path d="M132 62 L132 40 L116 58 Z" fill={c.accent} />
        </>
      );
    case "squirrel":
      return (
        <>
          <path d="M64 66 C58 46 64 32 72 30 C78 38 84 50 84 60 Z" fill={c.fur} />
          <path d="M136 66 C142 46 136 32 128 30 C122 38 116 50 116 60 Z" fill={c.fur} />
          <path d="M72 30 l-6 -10 M72 30 l2 -11" stroke={c.fur} strokeWidth="4" strokeLinecap="round" />
          <path d="M128 30 l6 -10 M128 30 l-2 -11" stroke={c.fur} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "otter":
      return (
        <>
          <circle cx="62" cy="72" r="9" fill={c.fur} />
          <circle cx="138" cy="72" r="9" fill={c.fur} />
          <circle cx="62" cy="72" r="4" fill={c.mask} />
          <circle cx="138" cy="72" r="4" fill={c.mask} />
        </>
      );
    default:
      return (
        <>
          <circle cx="64" cy="58" r="14" fill={c.fur} />
          <circle cx="136" cy="58" r="14" fill={c.fur} />
          <circle cx="64" cy="58" r="7" fill={c.accent} />
          <circle cx="136" cy="58" r="7" fill={c.accent} />
        </>
      );
  }
}

function Heart({ x, y, delay }: { x: number; y: number; delay: string }) {
  return (
    <path
      className="float-up"
      style={{ animationDelay: delay, transformBox: "fill-box", transformOrigin: "center" }}
      d={`M${x} ${y + 6} c-6 -5 -12 -9 -12 -15 a6 6 0 0 1 12 -2 a6 6 0 0 1 12 2 c0 6 -6 10 -12 15 z`}
    />
  );
}

function shade(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)),
  );
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}
const lighten = (hex: string, amt: number) => shade(hex, amt);
const darken = (hex: string, amt: number) => shade(hex, -amt);
