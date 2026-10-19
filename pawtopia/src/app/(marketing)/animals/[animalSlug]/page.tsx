import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimalArt, PlaceholderBadge } from "@/components/art/AnimalArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { AdoptCta } from "@/components/marketing/AdoptCta";
import { ChapterTeaser } from "@/components/marketing/StoryParts";
import { TrackView } from "@/components/marketing/TrackView";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { ButtonLink, FictionDisclosure, Notice, Pill } from "@/components/ui";
import { getIsEditor } from "@/lib/auth";
import { getMyAdoptionId } from "@/lib/data/player";
import { getAnimalBySlug, getChapterOutline, getLaunchSettings, listRescuesForAnimal } from "@/lib/data/catalog";
import { assetMap } from "@/lib/animals";

const SCENE_FOR: Record<string, string> = { riverbank: "river", "frosty-cove": "snow" };

export async function generateMetadata({ params }: PageProps<"/animals/[animalSlug]">): Promise<Metadata> {
  const { animalSlug } = await params;
  const animal = await getAnimalBySlug(animalSlug);
  if (!animal) return { title: "Animal" };
  return { title: `${animal.name} the ${animal.species}`, description: animal.tagline ?? undefined };
}

export default async function AnimalPage({ params }: PageProps<"/animals/[animalSlug]">) {
  const { animalSlug } = await params;
  const animal = await getAnimalBySlug(animalSlug);
  if (!animal) notFound();
  const isEditor = await getIsEditor();
  const [launch, outline, rescues, adoptionId] = await Promise.all([
    getLaunchSettings(),
    getChapterOutline(animal.id),
    listRescuesForAnimal(animal.id),
    getMyAdoptionId(animal.id),
  ]);
  const assets = assetMap(animal);
  const isPreview = animal.status === "draft";

  return (
    <article className="mx-auto max-w-6xl px-4 pb-12 pt-4 md:pt-10">
      <TrackView event="animal_page_viewed" animalSlug={animal.slug} />
      {isPreview && (
        <Notice tone="warning" className="mb-4">
          Admin preview — this character is a <strong>draft</strong>. Visitors can&apos;t see this page yet.
        </Notice>
      )}
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="relative aspect-square overflow-hidden rounded-[2.25rem] shadow-2xl ring-4 ring-white">
          <SceneBackdrop style={SCENE_FOR[animal.habitat_slug ?? ""] ?? "forest"} />
          <div className="absolute bottom-[6%] left-1/2 h-[68%] w-[70%] -translate-x-1/2">
            <AnimalArt animal={animal} assets={assets} priority />
          </div>
          <PlaceholderBadge assets={assets} className="absolute right-4 top-4" />
        </div>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-widest text-terracotta">{animal.species}</p>
          <h1 className="font-display text-5xl font-bold" data-testid="animal-name">{animal.name}</h1>
          {animal.tagline && <p className="mt-3 text-lg">{animal.tagline}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {animal.personality_tags.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>

          <div className="mt-6 grid gap-3 rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-ink/5">
            <FictionDisclosure />
            {animal.status === "coming_soon" && !isEditor ? (
              <Notice>🔒 {animal.name} arrives with an upcoming rescue episode. Stay tuned!</Notice>
            ) : animal.status === "archived" && !adoptionId ? (
              <Notice>{animal.name} is no longer available for new adoptions.</Notice>
            ) : adoptionId ? (
              <ButtonLink href={`/app/animals/${adoptionId}`} size="lg">🏡 Visit {animal.name}</ButtonLink>
            ) : launch.mode === "open" || isEditor ? (
              <AdoptCta href={`/animals/${animal.slug}/adopt`} label={`Virtually adopt ${animal.name} — Free`} animalSlug={animal.slug} />
            ) : (
              <WaitlistForm context="animal_page" />
            )}
          </div>

          {animal.bio && <p className="mt-6 whitespace-pre-line text-ink-soft">{animal.bio}</p>}
          {animal.appearance && (
            <p className="mt-3 text-sm text-ink-soft">
              <strong className="text-ink">Look for:</strong> {animal.appearance}
            </p>
          )}
          {rescues.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-xl font-bold">Rescue episodes</h2>
              <ul className="mt-2 grid gap-2">
                {rescues.map((r) => (
                  <li key={r.id}>
                    <Link href={`/r/${r.slug}`} className="block rounded-2xl bg-white px-4 py-3 font-semibold ring-1 ring-ink/5 hover:bg-sage">
                      🎬 {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8">
            <ChapterTeaser outline={outline} name={animal.name} />
          </div>
        </div>
      </div>
    </article>
  );
}
