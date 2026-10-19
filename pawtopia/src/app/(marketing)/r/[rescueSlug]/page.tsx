import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimalArt, PlaceholderBadge } from "@/components/art/AnimalArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { AdoptCta } from "@/components/marketing/AdoptCta";
import { ChapterTeaser, VideoLinks } from "@/components/marketing/StoryParts";
import { TrackView } from "@/components/marketing/TrackView";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { ButtonLink, FictionDisclosure, Notice, Pill } from "@/components/ui";
import { getIsEditor } from "@/lib/auth";
import { getMyAdoptionId } from "@/lib/data/player";
import { getChapterOutline, getLaunchSettings, getRescueBySlug } from "@/lib/data/catalog";
import { assetMap } from "@/lib/animals";

export async function generateMetadata({ params }: PageProps<"/r/[rescueSlug]">): Promise<Metadata> {
  const { rescueSlug } = await params;
  const data = await getRescueBySlug(rescueSlug);
  if (!data || data.rescue.status !== "published") return { title: "Rescue story" };
  return {
    title: `${data.animal.name}'s rescue story`,
    description: `${data.rescue.synopsis ?? ""} Fictional AI-generated story — virtually adopt ${data.animal.name} free in Pawtopia.`,
  };
}

export default async function RescuePage({ params }: PageProps<"/r/[rescueSlug]">) {
  const { rescueSlug } = await params;
  const [data, isEditor, launch] = await Promise.all([getRescueBySlug(rescueSlug), getIsEditor(), getLaunchSettings()]);
  if (!data || !data.animal) notFound();
  const { rescue, animal } = data;
  const assets = assetMap(animal);
  const teaser = (animal.animal_assets ?? []).find((a) => a.id === rescue.teaser_asset_id) ?? assets.teaser;
  const poster =
    (animal.animal_assets ?? []).find((a) => a.id === rescue.poster_asset_id) ?? assets.poster ?? assets.cover;

  if (rescue.status === "archived" && !isEditor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">This episode has been retired</h1>
        <p className="mt-2 text-ink-soft">
          “{rescue.title}” is no longer featured, but you can still meet the other residents of Pawtopia.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {animal.status === "published" && (
            <ButtonLink href={`/animals/${animal.slug}`}>Meet {animal.name}</ButtonLink>
          )}
          <ButtonLink href="/" variant="light">
            Explore Pawtopia
          </ButtonLink>
        </div>
      </div>
    );
  }

  const [outline, adoptionId] = await Promise.all([getChapterOutline(animal.id), getMyAdoptionId(animal.id)]);
  const adoptable = animal.status === "published" || isEditor;

  return (
    <article className="mx-auto max-w-6xl px-4 pb-12 pt-4 md:pt-10">
      <TrackView event="rescue_landing_viewed" rescueSlug={rescue.slug} />
      {rescue.status !== "published" && (
        <Notice tone="warning" className="mb-4">
          Admin preview — this rescue is <strong>{rescue.status}</strong> and not visible to the public.
        </Notice>
      )}
      <div className="grid gap-8 md:grid-cols-[1.05fr_1fr] md:items-start">
        {/* media */}
        <div className="relative aspect-[5/4] overflow-hidden rounded-[2.25rem] bg-sage shadow-2xl ring-4 ring-white md:sticky md:top-24 md:aspect-[4/5]">
          {teaser?.media_kind === "video" ? (
            <video
              className="h-full w-full object-cover"
              src={teaser.public_url}
              poster={poster?.public_url}
              autoPlay
              muted
              loop
              playsInline
              aria-label={teaser.alt_text}
            />
          ) : poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster.public_url} alt={poster.alt_text} className="h-full w-full object-cover" />
          ) : (
            <>
              <SceneBackdrop style="forest" />
              <div className="absolute bottom-[6%] left-1/2 h-[60%] w-[70%] -translate-x-1/2">
                <AnimalArt animal={animal} assets={assets} state="happy" priority />
              </div>
              <PlaceholderBadge assets={assets} className="absolute right-4 top-4" />
            </>
          )}
          {(rescue.season || rescue.episode) && (
            <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cream">
              Rescue {rescue.season ? `S${rescue.season}` : ""}
              {rescue.episode ? ` · E${rescue.episode}` : ""}
            </span>
          )}
        </div>

        {/* story + CTA */}
        <div className="slide-up">
          <p className="text-sm font-extrabold uppercase tracking-widest text-terracotta">{rescue.title}</p>
          <h1 className="mt-1 font-display text-5xl font-bold" data-testid="animal-name">
            {animal.name}
          </h1>
          <p className="mt-1 text-lg font-semibold text-ink-soft">{animal.species}</p>
          {animal.personality_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {animal.personality_tags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          )}
          {animal.tagline && <p className="mt-4 text-lg">{animal.tagline}</p>}

          <div className="mt-6 grid gap-3 rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-ink/5">
            <FictionDisclosure />
            {adoptionId ? (
              <ButtonLink href={`/app/animals/${adoptionId}`} size="lg" className="w-full sm:w-auto">
                🏡 Visit {animal.name}
              </ButtonLink>
            ) : launch.mode === "open" || isEditor ? (
              adoptable ? (
                <AdoptCta
                  href={`/animals/${animal.slug}/adopt`}
                  label={`Virtually adopt ${animal.name} — Free`}
                  rescueSlug={rescue.slug}
                  animalSlug={animal.slug}
                />
              ) : (
                <Notice>{animal.name} is coming soon. Check back after the next episode!</Notice>
              )
            ) : (
              <WaitlistForm context="rescue_page" />
            )}
            <p className="text-xs text-ink-soft">Free to play · No real money · Sign in with just your email</p>
          </div>

          {rescue.synopsis && <p className="mt-6 text-lg font-semibold text-ink">{rescue.synopsis}</p>}
          {rescue.story_body && <p className="mt-3 whitespace-pre-line text-ink-soft">{rescue.story_body}</p>}
          <div className="mt-5">
            <VideoLinks rescue={rescue} />
          </div>
          <div className="mt-8">
            <ChapterTeaser outline={outline} name={animal.name} />
          </div>
          <p className="mt-8 text-sm">
            <Link href={`/animals/${animal.slug}`} className="font-bold text-forest hover:underline">
              See {animal.name}&apos;s full profile →
            </Link>
          </p>
        </div>
      </div>
    </article>
  );
}
