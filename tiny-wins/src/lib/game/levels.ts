/**
 * Level math. Mirrors the SQL functions in
 * supabase/migrations/20261019000002_functions.sql — keep them in sync
 * (tests/db/game.test.ts checks they agree).
 *
 * Total XP needed to reach level L is 25 * L * (L - 1):
 *   L1 = 0, L2 = 50, L3 = 150, L4 = 300, L5 = 500 ...
 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 25 * l * (l - 1);
}

export function levelForXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * safe) / 25)) / 2));
}

export function levelUpBonus(level: number): number {
  return 10 + 5 * level;
}

/** Progress inside the current level, for progress bars. */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  const into = xp - start;
  const needed = end - start;
  return {
    level,
    xpIntoLevel: into,
    xpForNext: needed,
    xpRemaining: end - xp,
    percent: needed > 0 ? Math.min(100, Math.round((into / needed) * 100)) : 100,
  };
}

/** Treehouse grows in visible stages as Pip levels up. */
export type TreehouseTier = 1 | 2 | 3 | 4;

export function treehouseTier(level: number): TreehouseTier {
  if (level >= 8) return 4;
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

export const TIER_INFO: Record<TreehouseTier, { name: string; unlock: string; nextAt?: number }> = {
  1: { name: "Cozy Nook", unlock: "A little room high in the oak.", nextAt: 3 },
  2: { name: "Lantern Porch", unlock: "A porch with a glowing lantern.", nextAt: 5 },
  3: { name: "Firefly Canopy", unlock: "Leafy canopy and friendly fireflies.", nextAt: 8 },
  4: { name: "Grand Oak Retreat", unlock: "A rope swing, birds, and a starry sky." },
};
