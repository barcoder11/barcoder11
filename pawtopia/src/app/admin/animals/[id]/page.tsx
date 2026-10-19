import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { AnimalFields } from "@/components/admin/AnimalFields";
import { AssetUploader } from "@/components/admin/AssetUploader";
import { Field, StatusBadge, adminInput } from "@/components/admin/fields";
import { AnimalArt } from "@/components/art/AnimalArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { ButtonLink, Card, Notice } from "@/components/ui";
import {
  deleteAsset, deleteChapter, deleteDraftAnimal, saveChapter, setAnimalStatus, setAssetActive, updateAnimal,
} from "../../actions";
import { assetMap } from "@/lib/data/catalog";
import { PHASES } from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
import type { Animal, AnimalAsset, Chapter, RescueStory } from "@/lib/types";
import { many, one } from "@/lib/data/db";

const REQUIRED_STATES = ["idle", "happy", "playing", "resting", "snacking"] as const;

export default async function EditAnimal({ params, searchParams }: PageProps<"/admin/animals/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [animalResult, habitatsResult, chaptersResult, rescuesResult] = await Promise.all([
    supabase.from("animals").select("*, animal_assets(*)").eq("id", id).maybeSingle(),
    supabase.from("habitats").select("slug, name").order("name"),
    supabase.from("story_chapters").select("*").eq("animal_id", id).order("ordinal"),
    supabase.from("rescue_stories").select("id, slug, title, status").eq("animal_id", id),
  ]);
  const animal = one<Animal>(animalResult, "admin animal");
  if (!animal) notFound();
  const habitats = many<{ slug: string; name: string }>(habitatsResult, "habitats");
  const chapters = many<Chapter>(chaptersResult, "chapters");
  const rescues = many<RescueStory>(rescuesResult, "animal rescues");
  const assets = (animal.animal_assets ?? []) as AnimalAsset[];
  const active = assetMap(animal);
  const missing = REQUIRED_STATES.filter((s) => !active[s]);
  const nextOrdinal = chapters.reduce((m, c) => Math.max(m, c.ordinal), 0) + 1;

  return (
    <div className="grid gap-6">
      {sp.created === "1" && <Notice tone="success">Draft created! Next: upload art, add chapters, then create its rescue episode.</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{animal.name}</h1>
          <StatusBadge status={animal.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/animals/${animal.slug}`} size="sm" variant="light" target="_blank">👁 Preview public page</ButtonLink>
          {animal.status !== "published" && <ActionButton action={setAnimalStatus.bind(null, id, "published")} label="Publish" variant="primary" />}
          {animal.status !== "coming_soon" && animal.status !== "published" && (
            <ActionButton action={setAnimalStatus.bind(null, id, "coming_soon")} label="Mark coming soon" />
          )}
          {animal.status === "published" && (
            <ActionButton action={setAnimalStatus.bind(null, id, "coming_soon")} label="Unpublish (coming soon)" />
          )}
          {animal.status !== "archived" && (
            <ActionButton
              action={setAnimalStatus.bind(null, id, "archived")}
              label="Archive"
              variant="danger"
              confirm="Archive this animal? Existing players keep their adoptions; new adoptions stop."
            />
          )}
          {animal.status === "archived" && <ActionButton action={setAnimalStatus.bind(null, id, "draft")} label="Restore to draft" />}
          {animal.status === "draft" && (
            <ActionButton action={deleteDraftAnimal.bind(null, id)} label="Delete draft" variant="danger" confirm="Delete this draft permanently?" />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-4 font-display text-xl font-bold">1 · Character details</h2>
          <ActionForm action={updateAnimal.bind(null, id)}>
            <AnimalFields animal={animal} habitats={habitats} />
          </ActionForm>
        </Card>
        <div className="grid content-start gap-4">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-square">
              <SceneBackdrop style="forest" />
              <div className="absolute inset-x-[15%] bottom-[5%] top-[20%]">
                <AnimalArt animal={animal} assets={active} />
              </div>
            </div>
            <p className="p-3 text-center text-xs text-ink-soft">Live preview (idle)</p>
          </Card>
          <Card>
            <h3 className="font-display text-lg font-bold">Rescue episodes</h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {rescues.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/rescues/${r.id}`} className="font-bold text-forest hover:underline">{r.title}</Link>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
            <ButtonLink href={`/admin/rescues/new?animal=${id}`} size="sm" variant="honey" className="mt-3">+ Rescue episode</ButtonLink>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="font-display text-xl font-bold">2 · Art & animation assets</h2>
        {missing.length > 0 && (
          <Notice tone="warning" className="my-3">
            Using placeholder art for: {missing.join(", ")}. Upload official art for each state when ready.
          </Notice>
        )}
        <AssetUploader animalId={id} animalSlug={animal.slug} />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <li key={a.id} className={`rounded-2xl p-3 ring-1 ${a.is_active ? "bg-white ring-forest/40" : "bg-cream ring-ink/10 opacity-70"}`}>
              <div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-sage">
                {a.media_kind === "video" ? (
                  <video src={a.public_url} muted loop autoPlay playsInline className="h-full w-full object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.public_url} alt={a.alt_text} className="h-full w-full object-contain" />
                )}
              </div>
              <p className="mt-2 text-sm font-bold">{a.state} {a.is_active ? "· live" : "· inactive"}</p>
              <p className="text-xs text-ink-soft">{a.mime_type} · {a.width ?? "?"}×{a.height ?? "?"} · {Math.round((a.byte_size ?? 0) / 1024)} KB</p>
              <p className="mt-1 line-clamp-2 text-xs">Alt: {a.alt_text}</p>
              <div className="mt-2 flex gap-2">
                <ActionButton action={setAssetActive.bind(null, a.id, !a.is_active)} label={a.is_active ? "Deactivate" : "Make live"} />
                <ActionButton action={deleteAsset.bind(null, a.id)} label="Delete" variant="danger" confirm="Delete this file?" />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">3 · Recovery chapters</h2>
        <div className="grid gap-4">
          {chapters.map((c) => (
            <details key={c.id} className="rounded-2xl bg-cream p-4">
              <summary className="cursor-pointer font-bold">
                Chapter {c.ordinal}: {c.title} <span className="font-normal text-ink-soft">· {c.phase} · unlocks at {c.unlock_bond_xp} XP</span>
              </summary>
              <div className="mt-3">
                <ActionForm action={saveChapter.bind(null, id, c.id)}>
                  <ChapterFields chapter={c} />
                </ActionForm>
                <div className="mt-2">
                  <ActionButton action={deleteChapter.bind(null, id, c.id)} label="Delete chapter" variant="danger" confirm="Delete this chapter? Players lose access to its text." />
                </div>
              </div>
            </details>
          ))}
          <div className="rounded-2xl border-2 border-dashed border-ink/10 p-4">
            <h3 className="mb-3 font-bold">Add chapter</h3>
            <ActionForm action={saveChapter.bind(null, id, null)} submitLabel="Add chapter">
              <ChapterFields ordinal={nextOrdinal} />
            </ActionForm>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChapterFields({ chapter, ordinal }: { chapter?: Chapter; ordinal?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Field label="Number"><input type="number" name="ordinal" min={1} max={20} defaultValue={chapter?.ordinal ?? ordinal} className={adminInput} /></Field>
      <Field label="Phase">
        <select name="phase" defaultValue={chapter?.phase ?? "arrival"} className={adminInput}>
          {PHASES.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Unlocks at bond XP"><input type="number" name="unlock_bond_xp" min={0} defaultValue={chapter?.unlock_bond_xp ?? 0} className={adminInput} /></Field>
      <div className="md:col-span-3">
        <Field label="Title"><input name="title" maxLength={80} required defaultValue={chapter?.title} className={adminInput} /></Field>
      </div>
      <div className="md:col-span-3">
        <Field label="Chapter text (fictional, gentle — no distressing detail)">
          <textarea name="body" maxLength={4000} required defaultValue={chapter?.body} className={`${adminInput} min-h-32`} />
        </Field>
      </div>
    </div>
  );
}
