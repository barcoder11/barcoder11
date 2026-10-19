import type { CareAction, Economy, RecoveryPhase } from "@/lib/types";

export const CARE_ACTIONS: { id: CareAction; label: string; emoji: string; verb: string }[] = [
  { id: "comfort", label: "Comfort", emoji: "🤗", verb: "gave a gentle cuddle" },
  { id: "snack", label: "Snack", emoji: "🫐", verb: "shared a berry snack" },
  { id: "play", label: "Play", emoji: "🎾", verb: "played a game of fetch" },
  { id: "rest", label: "Rest", emoji: "🌙", verb: "settled in for a cozy nap" },
];

export const PHASES: { id: RecoveryPhase; label: string; emoji: string }[] = [
  { id: "arrival", label: "Arrival", emoji: "🌧️" },
  { id: "feeling_safe", label: "Feeling Safe", emoji: "🏡" },
  { id: "learning_to_trust", label: "Learning to Trust", emoji: "🤝" },
  { id: "thriving", label: "Thriving", emoji: "🌻" },
  { id: "new_beginning", label: "New Beginning", emoji: "🌙" },
];

export function phaseLabel(phase: RecoveryPhase) {
  return PHASES.find((p) => p.id === phase)?.label ?? phase;
}

// Text equivalents for every reaction (accessibility + flavour).
export const REACTIONS: Record<CareAction, string[]> = {
  comfort: ["{name} snuggles into your hands and lets out a happy chirr.", "{name} blinks slowly — that's raccoon for 'thank you'.", "{name} leans in for another cuddle. Hearts everywhere!"],
  snack: ["{name} nibbles a berry with tiny careful paws.", "{name} washes the berry in the creek first, very fancy.", "Crunch crunch! {name} looks very pleased."],
  play: ["{name} pounces on the ball and rolls in the clover!", "{name} does a happy little hop-and-spin.", "{name} brings the ball back, then decides to keep it."],
  rest: ["{name} curls up with tail over nose. Sweet dreams.", "{name} yawns enormously and settles into the blanket.", "{name} drifts off, dreaming of shiny pebbles."],
};

export function reactionText(action: CareAction, name: string, seed: number) {
  const list = REACTIONS[action];
  return list[Math.abs(seed) % list.length].replaceAll("{name}", name);
}

/** Progress within the current level, for the bond bar. */
export function levelProgress(xp: number, thresholds: number[]) {
  const sorted = [...thresholds].sort((a, b) => a - b);
  let level = 1;
  for (let i = 0; i < sorted.length; i++) if (xp >= sorted[i]) level = i + 1;
  const floor = sorted[level - 1] ?? 0;
  const ceil = sorted[level];
  if (ceil === undefined) return { level, pct: 100, toNext: 0 };
  return { level, pct: Math.round(((xp - floor) / (ceil - floor)) * 100), toNext: ceil - xp };
}

export const DEFAULT_ECONOMY: Economy = {
  welcome_acorns: 50,
  actions: {
    comfort: { xp: 5, acorns: 5, cooldown_seconds: 20 },
    snack: { xp: 5, acorns: 5, cooldown_seconds: 30 },
    play: { xp: 8, acorns: 5, cooldown_seconds: 30 },
    rest: { xp: 3, acorns: 5, cooldown_seconds: 45 },
  },
  daily_acorn_actions: 3,
  daily_xp_cap: 60,
  first_care_gift_decor: "soft-blanket",
  level_thresholds: [0, 15, 40, 75, 120, 180, 250, 330, 420, 520],
};

/** Swaps an animal's canonical name for the player's nickname (whole words only). */
export function personalize(text: string, canonical: string, nickname: string) {
  if (!nickname || canonical === nickname) return text;
  const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`\\b${escaped}\\b`, "g"), nickname);
}
