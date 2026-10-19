// App-level shapes. Rows come from the generated schema (database.types.ts), so a
// migration that renames or retypes a column breaks the build instead of the app.
// A few columns are narrowed to what the app stores in them: jsonb columns and
// text columns limited by a CHECK constraint, which the generator can't see.
import type { Enums, Tables } from "@/lib/database.types";

/** A generated row with some columns narrowed. */
type Narrow<Row, Columns extends { [K in keyof Row]?: unknown }> = Omit<Row, keyof Columns> & Columns;

export type AssetState = Enums<"asset_state">;
export type CareAction = Enums<"care_action_type">;
export type RecoveryPhase = Enums<"recovery_phase">;
/** animals.placeholder_style CHECK constraint. */
export type PlaceholderStyle = "raccoon" | "otter" | "penguin" | "fox" | "squirrel" | "generic";
/** decor_catalog.slot_category CHECK constraint (also habitat slot categories). */
type SlotCategory = "small" | "large" | "hanging";

export type AnimalColors = { fur?: string; mask?: string; accent?: string; belly?: string };

export type AnimalAsset = Tables<"animal_assets">;

export type Animal = Narrow<Tables<"animals">, { placeholder_style: PlaceholderStyle; colors: AnimalColors }> & {
  animal_assets?: AnimalAsset[];
};

export type RescueStory = Tables<"rescue_stories">;

export type Chapter = Tables<"story_chapters">;
export type ChapterOutline = Pick<Chapter, "ordinal" | "phase" | "title" | "unlock_bond_xp">;

export type HabitatSlot = { id: string; category: SlotCategory; label: string; x: number; y: number; z: number };
export type Habitat = Narrow<Tables<"habitats">, { slots: HabitatSlot[] }>;

export type Decor = Narrow<Tables<"decor_catalog">, { slot_category: SlotCategory }>;

export type Placement = { slot_id: string; decor_slug: string };

/** app_settings 'economy' value. */
export type Economy = {
  welcome_acorns: number;
  actions: Record<CareAction, { xp: number; acorns: number; cooldown_seconds: number }>;
  daily_acorn_actions: number;
  daily_xp_cap: number;
  first_care_gift_decor: string;
  level_thresholds: number[];
};

/** app_settings 'launch' value. */
export type LaunchSettings = { mode: "open" | "waitlist"; featured_animal_slug?: string };

export type Profile = Narrow<Tables<"profiles">, { first_touch: Record<string, string> | null }>;

export type UserAnimal = Tables<"user_animals"> & { animals?: Animal };
