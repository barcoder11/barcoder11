import type { Database as Generated, Json } from "@/lib/database.types";
import type { CareAction, Placement, RecoveryPhase } from "@/lib/types";

// The generated types (database.types.ts) can't know two things about our SQL
// functions, so they are declared here once and every call site is typed:
//   1. which arguments accept NULL (Postgres doesn't record argument nullability),
//   2. the shape of the jsonb each function returns.
// Keep these in step with supabase/migrations.

type Functions = Generated["public"]["Functions"];
type ArgsOf<N extends keyof Functions> = Functions[N]["Args"];

/** Function `N` with the `Nullable` arguments widened to accept NULL and a typed result. */
type Fn<N extends keyof Functions, Nullable extends keyof ArgsOf<N> = never, Returns = Functions[N]["Returns"]> = {
  Args: Omit<ArgsOf<N>, Nullable> & { [K in keyof Pick<ArgsOf<N>, Nullable>]: Pick<ArgsOf<N>, Nullable>[K] | null };
  Returns: Returns;
};

type UnlockedChapter = { id: string; ordinal: number; title: string; phase: RecoveryPhase };

type AdoptResult =
  | { status: "onboarding_required" | "closed" | "not_available" | "invalid_nickname" }
  | { status: "already_adopted"; user_animal_id: string }
  | {
      status: "adopted";
      user_animal_id: string;
      welcome_acorns: number;
      balance: number;
      unlocked_chapters: UnlockedChapter[];
    };

export type CareResult = {
  status: "ok" | "replay" | "cooldown" | "not_found" | "invalid_action" | "invalid_request";
  action?: CareAction;
  xp_awarded?: number;
  acorns_awarded?: number;
  bond_xp?: number;
  level?: number;
  phase?: RecoveryPhase;
  balance?: number;
  daily_xp_remaining?: number;
  retry_after_seconds?: number;
  unlocked_chapters?: UnlockedChapter[];
  first_care?: boolean;
  gift?: { slug: string; name: string } | null;
};

export type PurchaseResult = {
  status: "purchased" | "replay" | "not_available" | "already_owned" | "insufficient_funds" | "invalid_request";
  balance?: number;
  price?: number;
  decor_slug?: string;
};

export type PlacementResult = {
  status: "placed" | "removed" | "invalid_slot" | "not_owned" | "wrong_slot" | "not_found";
  placements?: Placement[];
  expected?: string;
};

type WaitlistUpsertResult = { action: "send" | "skip" | "invalid" | "rate_limited" };
type WaitlistVerifyResult = { status: "verified" | "expired" | "invalid" };
type WaitlistUnsubscribeResult = { status: "unsubscribed" | "deleted" | "invalid" };

type PublishResult = {
  status: "published" | "not_found" | "animal_archived" | "animal_incomplete";
  rescue_slug?: string;
  animal_slug?: string;
  missing?: string;
};

/** Rows without a rescue (direct visits) have NULL rescue columns (LEFT JOIN). */
type FunnelRow = Omit<Functions["admin_funnel"]["Returns"][number], "rescue_id" | "rescue_slug" | "rescue_title"> & {
  rescue_id: string | null;
  rescue_slug: string | null;
  rescue_title: string | null;
};

type AdminOverview = Record<
  | "players"
  | "adoptions"
  | "care_24h"
  | "landing_views_7d"
  | "animals_published"
  | "animals_draft"
  | "rescues_published"
  | "waitlist_pending"
  | "waitlist_verified",
  number
>;

type FunctionOverrides = {
  adopt_animal: Fn<"adopt_animal", "p_nickname", AdoptResult>;
  admin_funnel: Fn<"admin_funnel", never, FunnelRow[]>;
  admin_delete_waitlist_entry: Fn<"admin_delete_waitlist_entry", never, { status: "deleted" | "not_found" }>;
  admin_overview: Fn<"admin_overview", never, AdminOverview>;
  admin_publish_rescue: Fn<"admin_publish_rescue", never, PublishResult>;
  complete_onboarding: Fn<
    "complete_onboarding",
    "p_display_name" | "p_preferred_habitat",
    { status: "ok" | "terms_required" | "invalid_name"; first_time?: boolean }
  >;
  export_my_data: Fn<"export_my_data", never, { [key: string]: Json }>;
  perform_care: Fn<"perform_care", never, CareResult>;
  place_decor: Fn<"place_decor", never, PlacementResult>;
  purchase_decor: Fn<"purchase_decor", never, PurchaseResult>;
  record_signup: Fn<"record_signup", "p_anonymous_id" | "p_first_touch", { status: "ok" }>;
  remove_decor: Fn<"remove_decor", never, PlacementResult>;
  rename_adoption: Fn<
    "rename_adoption",
    "p_nickname",
    { status: "ok" | "invalid_nickname" | "not_found"; nickname?: string | null }
  >;
  rename_sanctuary: Fn<"rename_sanctuary", never, { status: "ok" | "invalid_name" }>;
  run_maintenance: Fn<"run_maintenance", never, Record<string, string | number>>;
  track_event: Fn<"track_event", "p_anonymous_id" | "p_user_id" | "p_rescue_slug" | "p_animal_slug">;
  update_profile: Fn<"update_profile", "p_display_name", { status: "ok" | "invalid_name" }>;
  waitlist_unsubscribe: Fn<"waitlist_unsubscribe", never, WaitlistUnsubscribeResult>;
  waitlist_upsert: Fn<"waitlist_upsert", never, WaitlistUpsertResult>;
  waitlist_verify: Fn<"waitlist_verify", never, WaitlistVerifyResult>;
};

/** The schema type every Supabase client in the app is created with. */
export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Functions"> & {
    Functions: Omit<Functions, keyof FunctionOverrides> & FunctionOverrides;
  };
};
