import type { EnergyTime, GoalId, ShopCategory, StepSize } from "./types";

export const GOAL_INFO: Record<GoalId, { label: string; emoji: string; blurb: string; color: string }> = {
  fitness: { label: "Fitness", emoji: "🏃", blurb: "Move a little every day", color: "#5BA88F" },
  study: { label: "Studying", emoji: "📚", blurb: "Learn in tiny focused bursts", color: "#6C8FD1" },
  organization: { label: "Organization", emoji: "🧹", blurb: "Tidy space, calmer mind", color: "#C98B4A" },
  money: { label: "Saving money", emoji: "🐷", blurb: "Mindful spending, growing stash", color: "#D9A13B" },
  kindness: { label: "Kindness", emoji: "💛", blurb: "To others and to yourself", color: "#D9727B" },
};

export const ENERGY_OPTIONS: { id: EnergyTime; label: string; emoji: string }[] = [
  { id: "morning", label: "Mornings", emoji: "🌅" },
  { id: "afternoon", label: "Afternoons", emoji: "☀️" },
  { id: "evening", label: "Evenings", emoji: "🌙" },
  { id: "anytime", label: "It changes", emoji: "🎲" },
];

export const STEP_OPTIONS: { id: StepSize; label: string; blurb: string }[] = [
  { id: "tiny", label: "Tiny steps", blurb: "Mostly 1–5 minute quests. Perfect for busy or low-energy days." },
  { id: "small", label: "Small steps", blurb: "A mix of 1–10 minute quests." },
];

export const SHOP_CATEGORIES: { id: ShopCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "furniture", label: "Furniture" },
  { id: "plants", label: "Plants" },
  { id: "decor", label: "Decor" },
  { id: "lighting", label: "Lighting" },
  { id: "walls", label: "Walls & floors" },
];

/** Friendly messages for errors raised by the database functions. */
export const GAME_ERRORS: Record<string, string> = {
  not_authenticated: "Please log in again.",
  quest_not_found: "We couldn't find that quest.",
  quest_expired: "That quest is from a previous day. Fresh quests are ready!",
  quest_already_completed: "You already finished that one!",
  swap_used: "You've already swapped a quest today.",
  no_alternative: "No other quests to swap in right now.",
  item_not_found: "That item isn't in the shop.",
  already_owned: "You already own this!",
  level_too_low: "Level up a bit more to unlock this.",
  not_enough_acorns: "Not enough acorns yet. Finish a quest to earn more!",
  not_owned: "You need to own this before placing it.",
  invalid_display_name: "Please enter a name (up to 40 characters).",
  invalid_goals: "Pick at least one goal.",
  invalid_timezone: "That timezone isn't recognized.",
  timezone_change_too_soon: "You can change your timezone once every 24 hours.",
  invalid_energy_time: "Please choose when you have the most energy.",
  invalid_step_size: "Please choose a step size.",
};

export function friendlyGameError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  const key = Object.keys(GAME_ERRORS).find((k) => message.includes(k));
  return key ? GAME_ERRORS[key] : "Something went wrong. Please try again.";
}
