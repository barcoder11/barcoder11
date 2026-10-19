"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getIsAdmin, getIsEditor, getSessionUser } from "@/lib/auth";
import { MEDIA_BUCKET } from "@/lib/env";
import type { AssetState } from "@/lib/types";

export type FormState = { ok?: boolean; error?: string; message?: string };

const FORBIDDEN = { error: "Your account doesn't have permission to do that." };

/** Supabase client for content editors, or null (RLS enforces the same rule in the database). */
async function editorClient() {
  return (await getIsEditor()) ? createClient() : null;
}

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal(""));
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const ALLOWED_VIDEO_HOSTS = ["tiktok.com", "instagram.com", "facebook.com", "fb.watch", "youtube.com", "youtu.be"];
const videoUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && ALLOWED_VIDEO_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  }, "Must be an https link to TikTok, Instagram, Facebook or YouTube");

function formObject(form: FormData) {
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

function firstError(e: z.ZodError) {
  const issue = e.issues[0];
  return `${issue.path.join(".") || "Form"}: ${issue.message}`;
}

// ------------------------------------------------------------------ animals
const animalSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(40),
  species: z.string().trim().min(1).max(40),
  placeholder_style: z.enum(["raccoon", "otter", "penguin", "fox", "squirrel", "generic"]),
  habitat_slug: z.string().trim().max(60).optional().transform((v) => v || null),
  tagline: optionalText(140),
  bio: optionalText(2000),
  appearance: optionalText(1000),
  personality_tags: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8).map((t) => t.slice(0, 24))),
  fur: hex,
  mask: hex,
  accent: hex,
  belly: hex,
  sort_order: z.coerce.number().int().min(0).max(10000).default(100),
  featured: z.string().optional().transform((v) => v === "on"),
});

function animalRow(d: z.infer<typeof animalSchema>) {
  const colors = Object.fromEntries(
    (["fur", "mask", "accent", "belly"] as const).filter((k) => d[k]).map((k) => [k, d[k]]),
  );
  return {
    slug: d.slug, name: d.name, species: d.species, placeholder_style: d.placeholder_style, habitat_slug: d.habitat_slug,
    tagline: d.tagline, bio: d.bio, appearance: d.appearance, personality_tags: d.personality_tags, colors,
    sort_order: d.sort_order, featured: d.featured,
  };
}

export async function createAnimal(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = animalSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { data, error } = await supabase.from("animals").insert({ ...animalRow(parsed.data), status: "draft" }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That slug is already taken." : error.message };
  redirect(`/admin/animals/${data.id}?created=1`);
}

export async function updateAnimal(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = animalSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { error } = await supabase.from("animals").update(animalRow(parsed.data)).eq("id", id);
  if (error) return { error: error.code === "23505" ? "That slug is already taken." : error.message };
  revalidatePath(`/admin/animals/${id}`);
  return { ok: true, message: "Saved." };
}

export async function setAnimalStatus(id: string, status: "draft" | "coming_soon" | "published" | "archived") {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { error } = await supabase.from("animals").update({ status }).eq("id", id);
  revalidatePath(`/admin/animals/${id}`);
  revalidatePath("/admin/animals");
  return error ? { error: error.message } : { ok: true };
}

export async function deleteDraftAnimal(id: string) {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { data, error } = await supabase.from("animals").delete().eq("id", id).eq("status", "draft").select("id");
  if (error || !data?.length) return { error: "Only drafts without rescue episodes or adoptions can be deleted. Archive instead." };
  redirect("/admin/animals");
}

// ------------------------------------------------------------------ chapters
const chapterSchema = z.object({
  ordinal: z.coerce.number().int().min(1).max(20),
  phase: z.enum(["arrival", "feeling_safe", "learning_to_trust", "thriving", "new_beginning"]),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(4000),
  unlock_bond_xp: z.coerce.number().int().min(0).max(100000),
});

export async function saveChapter(animalId: string, chapterId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = chapterSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const res = chapterId
    ? await supabase.from("story_chapters").update(parsed.data).eq("id", chapterId)
    : await supabase.from("story_chapters").insert({ ...parsed.data, animal_id: animalId });
  if (res.error) return { error: res.error.code === "23505" ? "A chapter with that number already exists." : res.error.message };
  revalidatePath(`/admin/animals/${animalId}`);
  return { ok: true, message: "Chapter saved." };
}

export async function deleteChapter(animalId: string, chapterId: string) {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  await supabase.from("story_chapters").delete().eq("id", chapterId);
  revalidatePath(`/admin/animals/${animalId}`);
}

// ------------------------------------------------------------------ assets
const IMAGE_TYPES = ["image/png", "image/webp", "image/jpeg", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const assetSchema = z.object({
  animalId: z.string().uuid(),
  state: z.enum(["cover", "avatar", "idle", "happy", "comforted", "snacking", "playing", "resting", "poster", "teaser"]),
  path: z.string().regex(/^animals\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/),
  mime: z.enum([...IMAGE_TYPES, ...VIDEO_TYPES] as [string, ...string[]]),
  size: z.number().int().positive().max(50 * 1024 * 1024),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  alt: z.string().trim().min(3, "Alt text is required").max(300),
  credits: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Registers a file the admin just uploaded directly to Storage (browser → Supabase, RLS-protected). */
export async function registerAsset(input: z.input<typeof assetSchema>): Promise<FormState> {
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  if (IMAGE_TYPES.includes(d.mime) && d.size > 10 * 1024 * 1024) return { error: "Images must be 10 MB or smaller." };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const user = await getSessionUser();

  const { data: animal } = await supabase.from("animals").select("id, slug").eq("id", d.animalId).single();
  if (!animal || !d.path.startsWith(`animals/${animal.slug}/`)) return { error: "Upload path doesn't match this animal." };

  // Confirm the object really exists in storage before referencing it.
  const folder = d.path.split("/").slice(0, 2).join("/");
  const file = d.path.split("/")[2];
  const { data: listed } = await supabase.storage.from(MEDIA_BUCKET).list(folder, { search: file });
  if (!listed?.some((o) => o.name === file)) return { error: "Uploaded file not found in storage." };

  const publicUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(d.path).data.publicUrl;
  await supabase.from("animal_assets").update({ is_active: false }).eq("animal_id", d.animalId).eq("state", d.state).eq("is_active", true);
  const { error } = await supabase.from("animal_assets").insert({
    animal_id: d.animalId,
    state: d.state as AssetState,
    media_kind: VIDEO_TYPES.includes(d.mime) ? "video" : "image",
    storage_path: d.path,
    public_url: publicUrl,
    mime_type: d.mime,
    byte_size: d.size,
    width: d.width,
    height: d.height,
    alt_text: d.alt,
    credits: d.credits || null,
    source_notes: d.notes || null,
    is_active: true,
    created_by: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/animals/${d.animalId}`);
  revalidatePath("/admin/assets");
  return { ok: true, message: "Asset uploaded and now live for that state." };
}

export async function setAssetActive(assetId: string, active: boolean) {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { data: asset } = await supabase.from("animal_assets").select("animal_id, state").eq("id", assetId).single();
  if (!asset) return { error: "Not found" };
  if (active) {
    await supabase.from("animal_assets").update({ is_active: false }).eq("animal_id", asset.animal_id).eq("state", asset.state).eq("is_active", true);
  }
  const { error } = await supabase.from("animal_assets").update({ is_active: active }).eq("id", assetId);
  revalidatePath(`/admin/animals/${asset.animal_id}`);
  revalidatePath("/admin/assets");
  return error ? { error: error.message } : { ok: true };
}

export async function deleteAsset(assetId: string) {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { data: asset } = await supabase.from("animal_assets").select("animal_id, storage_path").eq("id", assetId).single();
  if (!asset) return { error: "Not found" };
  await supabase.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);
  await supabase.from("animal_assets").delete().eq("id", assetId);
  revalidatePath(`/admin/animals/${asset.animal_id}`);
  revalidatePath("/admin/assets");
  return { ok: true };
}

export async function updateAssetText(assetId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ alt: z.string().trim().min(3).max(300), credits: z.string().trim().max(300).optional() })
    .safeParse(formObject(form));
  if (!parsed.success) return { error: "Alt text must be 3–300 characters." };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { error } = await supabase
    .from("animal_assets")
    .update({ alt_text: parsed.data.alt, credits: parsed.data.credits || null })
    .eq("id", assetId);
  revalidatePath("/admin/assets");
  return error ? { error: error.message } : { ok: true, message: "Saved." };
}

// ------------------------------------------------------------------ rescues
const rescueSchema = z.object({
  slug,
  animal_id: z.string().uuid("Choose an animal"),
  title: z.string().trim().min(3).max(120),
  synopsis: optionalText(600),
  story_body: optionalText(5000),
  season: z.coerce.number().int().min(1).max(99).optional().or(z.literal("").transform(() => undefined)),
  episode: z.coerce.number().int().min(1).max(999).optional().or(z.literal("").transform(() => undefined)),
  tiktok_url: videoUrl,
  instagram_url: videoUrl,
  facebook_url: videoUrl,
  youtube_url: videoUrl,
  poster_asset_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  teaser_asset_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

function rescueRow(d: z.infer<typeof rescueSchema>) {
  return {
    ...d,
    season: d.season ?? null,
    episode: d.episode ?? null,
    poster_asset_id: d.poster_asset_id ?? null,
    teaser_asset_id: d.teaser_asset_id ?? null,
    ai_fiction_disclosure: true,
  };
}

export async function createRescue(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = rescueSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { data, error } = await supabase.from("rescue_stories").insert({ ...rescueRow(parsed.data), status: "draft" }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That slug is already taken." : error.message };
  redirect(`/admin/rescues/${data.id}?created=1`);
}

export async function updateRescue(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = rescueSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { error } = await supabase.from("rescue_stories").update(rescueRow(parsed.data)).eq("id", id);
  if (error) return { error: error.code === "23505" ? "That slug is already taken." : error.message };
  revalidatePath(`/admin/rescues/${id}`);
  return { ok: true, message: "Saved." };
}

export async function publishRescue(id: string) {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { data, error } = await supabase.rpc("admin_publish_rescue", { p_rescue_id: id });
  revalidatePath(`/admin/rescues/${id}`);
  if (error) return { error: error.message };
  if (data?.status === "animal_incomplete") return { error: "Add a bio to the animal before publishing." };
  if (data?.status === "animal_archived") return { error: "The animal is archived. Restore it first." };
  return { ok: true };
}

export async function setRescueStatus(id: string, status: "draft" | "archived") {
  const supabase = await editorClient();
  if (!supabase) return FORBIDDEN;
  const { error } = await supabase.from("rescue_stories").update({ status }).eq("id", id);
  revalidatePath(`/admin/rescues/${id}`);
  return error ? { error: error.message } : { ok: true };
}

// ------------------------------------------------------------------ settings (admin only)
export async function updateLaunchSettings(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await getIsAdmin())) return { error: "Only admins can change launch settings." };
  const parsed = z
    .object({ mode: z.enum(["open", "waitlist"]), featured_animal_slug: z.string().regex(/^[a-z0-9-]{0,60}$/) })
    .safeParse(formObject(form));
  if (!parsed.success) return { error: "Invalid settings." };
  const supabase = await createClient();
  const user = await getSessionUser();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "launch", value: parsed.data, updated_by: user?.id, updated_at: new Date().toISOString() });
  revalidatePath("/admin");
  return error ? { error: error.message } : { ok: true, message: `Saved — game is now in ${parsed.data.mode === "open" ? "open beta" : "waitlist"} mode.` };
}

const economySchema = z.object({
  welcome_acorns: z.number().int().min(0).max(10000),
  actions: z.object(
    Object.fromEntries(
      (["comfort", "snack", "play", "rest"] as const).map((a) => [
        a,
        z.object({
          xp: z.number().int().min(0).max(1000),
          acorns: z.number().int().min(0).max(1000),
          cooldown_seconds: z.number().int().min(1).max(86400),
        }),
      ]),
    ) as Record<"comfort" | "snack" | "play" | "rest", z.ZodObject<{ xp: z.ZodNumber; acorns: z.ZodNumber; cooldown_seconds: z.ZodNumber }>>,
  ),
  daily_acorn_actions: z.number().int().min(0).max(4),
  daily_xp_cap: z.number().int().min(0).max(100000),
  first_care_gift_decor: z.string().regex(/^[a-z0-9-]{1,60}$/),
  level_thresholds: z.array(z.number().int().min(0)).min(1).max(50),
});

export async function updateEconomy(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await getIsAdmin())) return { error: "Only admins can change the economy." };
  let json: unknown;
  try {
    json = JSON.parse(String(form.get("economy") ?? ""));
  } catch {
    return { error: "That isn't valid JSON." };
  }
  const parsed = economySchema.safeParse(json);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const user = await getSessionUser();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "economy", value: parsed.data, updated_by: user?.id, updated_at: new Date().toISOString() });
  revalidatePath("/admin");
  return error ? { error: error.message } : { ok: true, message: "Economy updated. New values apply to the next care action." };
}
