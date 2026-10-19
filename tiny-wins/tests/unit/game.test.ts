import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ITEM_ART } from "@/components/treehouse/item-art";
import { SLOT_BOXES, SLOT_ORDER } from "@/components/treehouse/slots";
import { friendlyGameError } from "@/lib/game/constants";
import { levelForXp, levelProgress, levelUpBonus, treehouseTier, xpForLevel } from "@/lib/game/levels";
import { nextGoal } from "@/lib/game/next-goal";
import { ROOM_SLOTS, type ShopItem } from "@/lib/game/types";
import { safeNextPath } from "@/lib/utils";

const catalogSql = readFileSync(path.resolve(import.meta.dirname, "../../supabase/migrations/20261019000003_catalog.sql"), "utf8");
const shopBlock = catalogSql.slice(catalogSql.indexOf("insert into public.shop_items"), catalogSql.indexOf("insert into public.achievements"));
const catalogItems = [...shopBlock.matchAll(/\('([a-z0-9-]+)',\s*'[^']*',\s*'(?:[^']|'')*',\s*'([a-z]+)',\s*'([a-z_]+)'/g)].map((m) => ({
  id: m[1],
  slot: m[3],
}));

describe("levels", () => {
  it("follows 25 * L * (L - 1)", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 150, 300, 500]);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(149)).toBe(2);
    expect(levelForXp(150)).toBe(3);
    expect(levelForXp(-10)).toBe(1);
  });
  it("is exact at every boundary up to level 100", () => {
    for (let l = 1; l <= 100; l++) {
      expect(levelForXp(xpForLevel(l))).toBe(l);
      if (l > 1) expect(levelForXp(xpForLevel(l) - 1)).toBe(l - 1);
    }
  });
  it("reports progress inside a level", () => {
    expect(levelProgress(75)).toMatchObject({ level: 2, xpIntoLevel: 25, xpForNext: 100, xpRemaining: 75, percent: 25 });
  });
  it("level-up bonus and treehouse tiers", () => {
    expect(levelUpBonus(2)).toBe(20);
    expect([1, 2, 3, 4, 5, 7, 8, 20].map(treehouseTier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("treehouse art", () => {
  it("parses the catalog", () => {
    expect(catalogItems.length).toBe(36);
  });
  it("every catalog item has artwork and a valid slot", () => {
    for (const item of catalogItems) {
      expect(ITEM_ART[item.id], item.id).toBeDefined();
      expect(ROOM_SLOTS as readonly string[]).toContain(item.slot);
    }
  });
  it("every slot has a box and a drawing order", () => {
    for (const slot of ROOM_SLOTS) {
      expect(SLOT_BOXES[slot]).toBeDefined();
      expect(SLOT_ORDER).toContain(slot);
    }
  });
});

describe("next goal", () => {
  const item = (id: string, price: number, unlock_level = 1, is_starter = false): ShopItem => ({
    id, name: id, description: "", category: "decor", slot: "rug", price, unlock_level, is_starter, sort: price,
  });
  const items = [item("starter", 0, 1, true), item("a", 10), item("b", 40), item("c", 90, 3)];

  it("suggests the best affordable item", () => {
    expect(nextGoal(items, new Set(), 1, 50)).toMatchObject({ kind: "item", item: { id: "b" }, affordable: true });
  });
  it("otherwise the cheapest one to save for", () => {
    expect(nextGoal(items, new Set(), 1, 5)).toMatchObject({ kind: "item", item: { id: "a" }, affordable: false, acornsNeeded: 5 });
  });
  it("then the next level unlock, then done", () => {
    expect(nextGoal(items, new Set(["a", "b"]), 1, 500)).toMatchObject({ kind: "level", level: 3 });
    expect(nextGoal(items, new Set(["a", "b", "c"]), 5, 500)).toEqual({ kind: "complete" });
  });
});

describe("helpers", () => {
  it("only allows same-site redirects", () => {
    expect(safeNextPath("/quests")).toBe("/quests");
    expect(safeNextPath("//evil.com")).toBe("/home");
    expect(safeNextPath("/\\evil.com")).toBe("/home");
    expect(safeNextPath("https://evil.com")).toBe("/home");
    expect(safeNextPath(null)).toBe("/home");
  });
  it("maps database errors to friendly text", () => {
    expect(friendlyGameError('ERROR: not_enough_acorns')).toMatch(/Not enough acorns/);
    expect(friendlyGameError("something internal")).toBe("Something went wrong. Please try again.");
  });
});
