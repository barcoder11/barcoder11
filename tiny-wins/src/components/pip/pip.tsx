"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PIP_ASPECT, PIP_ASSETS, PIP_LINES, type PipPose } from "./pip-assets";

type PipProps = {
  pose?: PipPose;
  size?: number;
  className?: string;
  /** Show a speech bubble and hop when tapped. */
  interactive?: boolean;
  lines?: string[];
  priority?: boolean;
  /** Fill the parent box instead of using a fixed size. */
  fill?: boolean;
};

export function Pip({ pose = "idle", size = 160, className, interactive = false, lines = PIP_LINES, priority, fill = false }: PipProps) {
  const reduce = useReducedMotion();
  const [bubble, setBubble] = useState<string | null>(null);
  const [hop, setHop] = useState(0);
  const [tapPose, setTapPose] = useState<PipPose | null>(null);
  const asset = PIP_ASSETS[tapPose ?? pose];

  const onTap = () => {
    if (!interactive) return;
    setHop((h) => h + 1);
    setTapPose("happy");
    setBubble(lines[Math.floor(Math.random() * lines.length)]);
    window.setTimeout(() => setTapPose(null), 1200);
    window.setTimeout(() => setBubble(null), 3200);
  };

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- SVG/PNG art, swapped via the asset registry
    <img
      src={asset.src}
      alt={asset.alt}
      width={size * PIP_ASPECT}
      height={size}
      draggable={false}
      fetchPriority={priority ? "high" : undefined}
      className="pointer-events-none h-full w-full select-none object-contain drop-shadow-[0_10px_14px_rgba(60,40,20,0.18)]"
    />
  );

  return (
    <div
      className={cn("relative inline-block", fill && "block h-full w-full", className)}
      style={fill ? undefined : { width: size * PIP_ASPECT, height: size }}
    >
      {bubble && (
        <motion.div
          role="status"
          initial={reduce ? false : { opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[220px] -translate-x-1/2 rounded-2xl border border-border bg-card px-3 py-2 text-center text-sm font-semibold shadow-lift"
        >
          {bubble}
          <span className="absolute top-full left-1/2 -mt-px size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-border bg-card" />
        </motion.div>
      )}
      <motion.div
        key={hop}
        className="h-full w-full origin-bottom"
        initial={false}
        animate={reduce ? undefined : hop ? { y: [0, -22, 0], scaleY: [1, 1.04, 0.96, 1] } : { scaleY: [1, 1.02, 1] }}
        transition={hop ? { duration: 0.55, ease: "easeOut" } : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {interactive ? (
          <button
            type="button"
            onClick={onTap}
            className="block h-full w-full cursor-pointer rounded-3xl"
            aria-label="Say hi to Pip"
          >
            {img}
          </button>
        ) : (
          img
        )}
      </motion.div>
    </div>
  );
}
