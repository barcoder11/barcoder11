export const GOALS = ["fitness", "study", "organization", "money", "kindness"] as const;
export type GoalId = (typeof GOALS)[number];

export const ROOM_SLOTS = [
  "wallpaper",
  "floor",
  "window",
  "wall_art",
  "shelf",
  "lights",
  "bed",
  "rug",
  "desk",
  "lamp",
  "plant_left",
  "plant_right",
] as const;
export type RoomSlot = (typeof ROOM_SLOTS)[number];

export type ShopCategory = "furniture" | "plants" | "decor" | "lighting" | "walls";
export type EnergyTime = "morning" | "afternoon" | "evening" | "anytime";
export type StepSize = "tiny" | "small";

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  goals: GoalId[];
  energy_time: EnergyTime;
  step_size: StepSize;
  onboarded_at: string | null;
  xp: number;
  level: number;
  acorns: number;
  quests_completed: number;
  days_active: number;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
  timezone_changed_at: string | null;
  created_at: string;
};

export type Quest = {
  id: string;
  slot: number;
  date: string;
  templateId: string;
  title: string;
  description: string;
  category: GoalId;
  minutes: number;
  icon: string;
  pipLine: string;
  xp: number;
  acorns: number;
  completedAt: string | null;
};

export type QuestDay = {
  date: string;
  swapAvailable: boolean;
  quests: Quest[];
};

export type UnlockedAchievement = { id: string; title: string; icon: string; acorns: number };

export type CompleteQuestResult = {
  status: "completed" | "already_completed";
  xpGained: number;
  acornsGained: number;
  levelBonus?: number;
  xp: number;
  level: number;
  acorns: number;
  leveledUp: boolean;
  achievements: UnlockedAchievement[];
  allDone?: boolean;
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  slot: RoomSlot;
  price: number;
  unlock_level: number;
  is_starter: boolean;
  sort: number;
};

export type RoomLayout = Partial<Record<RoomSlot, string>>;

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  category: GoalId | null;
  threshold: number;
  acorn_reward: number;
  sort: number;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
