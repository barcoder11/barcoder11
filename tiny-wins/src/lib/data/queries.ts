import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Achievement, Profile, QuestDay, RoomLayout, RoomSlot, ShopItem } from "@/lib/game/types";

/**
 * Data access layer. Everything here runs as the signed-in user, so Row
 * Level Security decides what can be read. Results are memoized per request.
 */

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const requireUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
});

export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) throw new Error(`Could not load profile: ${error?.message ?? "missing"}`);
  return data as Profile;
});

export const getTodayQuests = cache(async (): Promise<QuestDay> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_today_quests");
  if (error) throw new Error(`Could not load quests: ${error.message}`);
  return data as QuestDay;
});

export const getRoomLayout = cache(async (): Promise<RoomLayout> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("room_slots").select("slot, item_id");
  if (error) throw new Error(`Could not load room: ${error.message}`);
  const layout: RoomLayout = {};
  for (const row of data ?? []) layout[row.slot as RoomSlot] = row.item_id as string;
  return layout;
});

export const getInventory = cache(async (): Promise<Set<string>> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory").select("item_id");
  if (error) throw new Error(`Could not load inventory: ${error.message}`);
  return new Set((data ?? []).map((r) => r.item_id as string));
});

export const getShopItems = cache(async (): Promise<ShopItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_items").select("*").order("sort");
  if (error) throw new Error(`Could not load shop: ${error.message}`);
  return (data ?? []) as ShopItem[];
});

export const getAchievements = cache(async () => {
  await requireUser();
  const supabase = await createClient();
  const [all, mine] = await Promise.all([
    supabase.from("achievements").select("*").order("sort"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at"),
  ]);
  if (all.error) throw new Error(all.error.message);
  if (mine.error) throw new Error(mine.error.message);
  const unlocked = new Map((mine.data ?? []).map((r) => [r.achievement_id as string, r.unlocked_at as string]));
  return ((all.data ?? []) as Achievement[]).map((a) => ({ ...a, unlockedAt: unlocked.get(a.id) ?? null }));
});

export type RewardEvent = { id: number; kind: string; ref: string; xp_delta: number; acorn_delta: number; created_at: string };

export const getRecentRewards = cache(async (limit = 15): Promise<RewardEvent[]> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reward_events")
    .select("id, kind, ref, xp_delta, acorn_delta, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as RewardEvent[];
});

export type HistoryDay = { date: string; completed: number; categories: Record<string, number> };

/** Completed quests per day for the last `days` quest days. */
export const getQuestHistory = cache(async (days = 7): Promise<{ byDay: HistoryDay[]; byCategory: Record<string, number> }> => {
  await requireUser();
  const supabase = await createClient();
  const today = await getTodayQuests();
  const end = new Date(`${today.date}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);

  const [recent, totals] = await Promise.all([
    supabase
      .from("daily_quests")
      .select("quest_date, completed_at, quest_templates(category)")
      .gte("quest_date", startStr)
      .not("completed_at", "is", null),
    supabase.from("daily_quests").select("quest_templates(category)").not("completed_at", "is", null).limit(5000),
  ]);
  if (recent.error) throw new Error(recent.error.message);
  if (totals.error) throw new Error(totals.error.message);

  const map = new Map<string, HistoryDay>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, completed: 0, categories: {} });
  }
  const categoryOf = (row: { quest_templates: unknown }) => {
    const t = row.quest_templates as { category?: string } | { category?: string }[] | null;
    return (Array.isArray(t) ? t[0]?.category : t?.category) ?? "other";
  };
  for (const row of recent.data ?? []) {
    const day = map.get(row.quest_date as string);
    if (!day) continue;
    day.completed += 1;
    const c = categoryOf(row);
    day.categories[c] = (day.categories[c] ?? 0) + 1;
  }
  const byCategory: Record<string, number> = {};
  for (const row of totals.data ?? []) {
    const c = categoryOf(row);
    byCategory[c] = (byCategory[c] ?? 0) + 1;
  }
  return { byDay: [...map.values()], byCategory };
});
