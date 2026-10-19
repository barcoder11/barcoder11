"use client";

import { motion, useReducedMotion } from "motion/react";
import { AcornIcon } from "@/components/brand/icons";

/** A little shower of acorns that pops out of a completed quest. */
export function RewardBurst({ count = 7 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        const dist = 46 + (i % 3) * 16;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 right-10"
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 20,
              scale: [0.4, 1.1, 0.9],
              opacity: [1, 1, 0],
              rotate: (i % 2 ? 1 : -1) * 90,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <AcornIcon className="size-5" />
          </motion.span>
        );
      })}
    </div>
  );
}
