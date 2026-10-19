import type { ShopItem } from "./types";

export type NextGoal =
  | { kind: "item"; item: ShopItem; affordable: boolean; acornsNeeded: number }
  | { kind: "level"; item: ShopItem; level: number }
  | { kind: "complete" };

/**
 * What should we nudge the player toward next? The cheapest decoration they
 * can unlock now; otherwise the next one that unlocks with a level.
 */
export function nextGoal(items: ShopItem[], owned: Set<string>, level: number, acorns: number): NextGoal {
  const available = items
    .filter((i) => !owned.has(i.id) && !i.is_starter && i.unlock_level <= level)
    .sort((a, b) => a.price - b.price || a.sort - b.sort);
  if (available.length) {
    const affordable = available.filter((i) => i.price <= acorns);
    // Show the priciest thing they can afford (more exciting), else the cheapest goal.
    const pick = affordable.length ? affordable[affordable.length - 1] : available[0];
    return { kind: "item", item: pick, affordable: pick.price <= acorns, acornsNeeded: Math.max(0, pick.price - acorns) };
  }
  const locked = items
    .filter((i) => !owned.has(i.id) && i.unlock_level > level)
    .sort((a, b) => a.unlock_level - b.unlock_level || a.price - b.price);
  if (locked.length) return { kind: "level", item: locked[0], level: locked[0].unlock_level };
  return { kind: "complete" };
}
