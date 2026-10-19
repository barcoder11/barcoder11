// Row shapes used by the app (hand-maintained to match supabase/migrations).

type ContentStatus = "draft" | "coming_soon" | "published" | "archived";
export type AssetState =
  "cover" | "avatar" | "idle" | "happy" | "comforted" | "snacking" | "playing" | "resting" | "poster" | "teaser";
export type CareAction = "comfort" | "snack" | "play" | "rest";
export type RecoveryPhase = "arrival" | "feeling_safe" | "learning_to_trust" | "thriving" | "new_beginning";
export type PlaceholderStyle = "raccoon" | "otter" | "penguin" | "fox" | "squirrel" | "generic";

export type AnimalColors = { fur?: string; mask?: string; accent?: string; belly?: string };

export type AnimalAsset = {
  id: string;
  animal_id: string;
  state: AssetState;
  media_kind: "image" | "video";
  storage_path: string;
  public_url: string;
  mime_type: string;
  alt_text: string;
  credits: string | null;
  source_notes: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  is_active: boolean;
  created_at: string;
};

export type Animal = {
  id: string;
  slug: string;
  name: string;
  species: string;
  placeholder_style: PlaceholderStyle;
  habitat_slug: string | null;
  tagline: string | null;
  bio: string | null;
  personality_tags: string[];
  appearance: string | null;
  colors: AnimalColors;
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  release_at: string | null;
  published_at: string | null;
  animal_assets?: AnimalAsset[];
};

export type RescueStory = {
  id: string;
  slug: string;
  animal_id: string;
  title: string;
  synopsis: string | null;
  story_body: string | null;
  season: number | null;
  episode: number | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  poster_asset_id: string | null;
  teaser_asset_id: string | null;
  status: ContentStatus;
  ai_fiction_disclosure: boolean;
  published_at: string | null;
  created_at: string;
};

export type ChapterOutline = { ordinal: number; phase: RecoveryPhase; title: string; unlock_bond_xp: number };
export type Chapter = ChapterOutline & { id: string; body: string; animal_id: string };

export type HabitatSlot = {
  id: string;
  category: "small" | "large" | "hanging";
  label: string;
  x: number;
  y: number;
  z: number;
};
export type Habitat = {
  slug: string;
  name: string;
  description: string | null;
  scene_style: string;
  slots: HabitatSlot[];
};

export type Decor = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  slot_category: "small" | "large" | "hanging";
  habitat_tags: string[];
  art_key: string;
  asset_path: string | null;
  enabled: boolean;
  sort_order: number;
};

export type Placement = { slot_id: string; decor_slug: string };

export type Economy = {
  welcome_acorns: number;
  actions: Record<CareAction, { xp: number; acorns: number; cooldown_seconds: number }>;
  daily_acorn_actions: number;
  daily_xp_cap: number;
  first_care_gift_decor: string;
  level_thresholds: number[];
};

export type LaunchSettings = { mode: "open" | "waitlist"; featured_animal_slug?: string };

export type Profile = {
  user_id: string;
  display_name: string | null;
  timezone: string;
  preferred_habitat: string | null;
  onboarding_completed_at: string | null;
  terms_accepted_at: string | null;
  marketing_opt_in: boolean;
  reduced_motion: boolean;
  first_touch: Record<string, string> | null;
  created_at: string;
};

export type UserAnimal = {
  id: string;
  user_id: string;
  animal_id: string;
  nickname: string | null;
  phase: RecoveryPhase;
  bond_xp: number;
  level: number;
  current_chapter: number;
  care_count: number;
  adopted_at: string;
  last_cared_at: string | null;
  animals?: Animal;
};

export type CareResult = {
  status: "ok" | "replay" | "cooldown" | "not_found" | "invalid_action" | "invalid_request" | "error";
  action?: CareAction;
  xp_awarded?: number;
  acorns_awarded?: number;
  bond_xp?: number;
  level?: number;
  phase?: RecoveryPhase;
  balance?: number;
  daily_xp_remaining?: number;
  retry_after_seconds?: number;
  unlocked_chapters?: { id: string; ordinal: number; title: string; phase: RecoveryPhase }[];
  first_care?: boolean;
  gift?: { slug: string; name: string } | null;
};
