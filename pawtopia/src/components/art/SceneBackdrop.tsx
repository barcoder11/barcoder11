import { useId } from "react";

/**
 * Layered, softly animated habitat backdrop (placeholder for commissioned
 * background art). `style` comes from habitats.scene_style.
 */
export function SceneBackdrop({ style = "forest", className = "" }: { style?: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const palette =
    style === "snow"
      ? { sky1: "#EAF5FA", sky2: "#CFE6F0", far: "#BFD9E6", mid: "#A7C9DA", near: "#F4FAFC", ground: "#E8F2F7", water: "#9FD0E3", tree: "#6C9AAF" }
      : style === "river"
        ? { sky1: "#FFF4DE", sky2: "#D7EEE6", far: "#B9DCC9", mid: "#7FB59A", near: "#5F9E7D", ground: "#9CCB8F", water: "#8FC9DA", tree: "#2F6B58" }
        : { sky1: "#FFF1D6", sky2: "#DDEDE2", far: "#BFDCC6", mid: "#86B897", near: "#5E9B75", ground: "#A3CF86", water: "#9AD0DD", tree: "#2F6B58" };

  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky1} />
          <stop offset="1" stopColor={palette.sky2} />
        </linearGradient>
        <radialGradient id={`sun-${id}`} cx="0.75" cy="0.12" r="0.45">
          <stop offset="0" stopColor="#FFE7B0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFE7B0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ground-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.ground} />
          <stop offset="1" stopColor={shadeHex(palette.ground, -0.12)} />
        </linearGradient>
      </defs>

      <rect width="400" height="400" fill={`url(#sky-${id})`} />
      <rect width="400" height="400" fill={`url(#sun-${id})`} />

      {/* sun rays */}
      <g opacity="0.25" fill="#FFF8EC">
        <path d="M300 0 L250 260 L280 260 Z" />
        <path d="M340 0 L330 240 L355 240 Z" />
      </g>

      {/* distant hills */}
      <path d="M0 210 C60 170 110 190 160 175 C220 155 270 185 320 165 C360 150 385 160 400 165 L400 400 L0 400 Z" fill={palette.far} />
      {/* mid trees */}
      <g fill={palette.mid}>
        {[20, 70, 120, 290, 340, 385].map((x, i) => (
          <g key={x} className="sway" style={{ animationDelay: `${i * 0.7}s` }}>
            {style === "snow" ? (
              <path d={`M${x} ${150 + (i % 2) * 12} l-22 60 h44 z M${x} ${172 + (i % 2) * 12} l-28 62 h56 z`} />
            ) : (
              <>
                <rect x={x - 3} y={200} width="6" height="40" fill={palette.tree} opacity="0.6" />
                <ellipse cx={x} cy={185 + (i % 2) * 10} rx="26" ry="38" />
              </>
            )}
          </g>
        ))}
      </g>
      {/* near hills */}
      <path d="M0 255 C70 230 140 245 200 240 C270 235 330 225 400 240 L400 400 L0 400 Z" fill={palette.near} />

      {/* creek / pool */}
      <path
        d="M-10 300 C60 285 120 300 180 292 C240 284 300 300 410 286 L410 312 C300 326 240 312 180 320 C120 328 60 312 -10 326 Z"
        fill={palette.water}
        opacity="0.9"
      />
      <path d="M40 300 h24 M150 298 h18 M280 296 h26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      {/* foreground ground */}
      <path d="M0 318 C80 308 160 322 240 314 C310 308 360 316 400 312 L400 400 L0 400 Z" fill={`url(#ground-${id})`} />

      {/* ferns / snow tufts */}
      {style === "snow" ? (
        <g fill="#ffffff" opacity="0.9">
          <ellipse cx="40" cy="352" rx="40" ry="14" />
          <ellipse cx="360" cy="360" rx="46" ry="16" />
        </g>
      ) : (
        <g fill={palette.tree} opacity="0.85">
          {[12, 388].map((x, i) => (
            <g key={x} className="sway" style={{ animationDelay: `${i}s` }}>
              <path d={`M${x} 400 C${x + (i ? -30 : 30)} 360 ${x + (i ? -40 : 40)} 340 ${x + (i ? -54 : 54)} 330 C${x + (i ? -30 : 30)} 350 ${x + (i ? -16 : 16)} 370 ${x} 400 Z`} />
              <path d={`M${x} 400 C${x + (i ? -10 : 10)} 360 ${x + (i ? -6 : 6)} 330 ${x + (i ? -14 : 14)} 310 C${x + (i ? -22 : 22)} 340 ${x + (i ? -16 : 16)} 370 ${x} 400 Z`} />
            </g>
          ))}
          {/* little flowers */}
          {[[90, 360], [300, 372], [210, 382]].map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y} r="3.2" fill="#FFF8EC" />
              <circle cx={x} cy={y} r="1.4" fill="#EDBC78" />
            </g>
          ))}
        </g>
      )}

      {/* fireflies / snowflakes */}
      <g fill={style === "snow" ? "#ffffff" : "#FFE08A"}>
        {[[60, 140], [130, 90], [250, 120], [330, 80], [370, 200], [180, 210]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={style === "snow" ? 2.5 : 2} className="firefly" style={{ animationDelay: `${i * 0.9}s` }} />
        ))}
      </g>
    </svg>
  );
}

function shadeHex(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
