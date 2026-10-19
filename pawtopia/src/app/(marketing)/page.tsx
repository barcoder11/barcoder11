import { AnimalCard } from "@/components/marketing/AnimalCard";
import { HeroScene } from "@/components/marketing/HeroScene";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { ButtonLink, Card, SectionTitle } from "@/components/ui";
import { getLaunchSettings, listCatalogAnimals, listPublishedRescues } from "@/lib/data/catalog";

export default async function LandingPage() {
  const [launch, animals, rescues] = await Promise.all([getLaunchSettings(), listCatalogAnimals(), listPublishedRescues()]);
  const featured =
    animals.find((a) => a.slug === launch.featured_animal_slug && a.status === "published") ??
    animals.find((a) => a.status === "published") ??
    animals[0];
  const featuredRescue = rescues.find((r) => r.animal_id === featured?.id);
  const rescueByAnimal = new Map(rescues.map((r) => [r.animal_id, r.slug]));
  const open = launch.mode === "open";

  return (
    <>
      {/* ------------------------------------------------ hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-8 md:grid-cols-2 md:pt-14">
        <div className="slide-up">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-forest shadow-sm ring-1 ring-ink/5">
            🌿 A cozy virtual sanctuary game
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-ink sm:text-6xl">
            Every rescue deserves a <span className="text-forest">new beginning.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Met {featured?.name ?? "Maple"} in one of our rescue videos? Their story continues here. Virtually adopt them,
            help them feel safe with comforting care, unlock their recovery chapters and build a sanctuary that&apos;s all yours.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {open && featured ? (
              <>
                <ButtonLink href={featuredRescue ? `/r/${featuredRescue.slug}` : `/animals/${featured.slug}`} size="lg">
                  🐾 Meet {featured.name}
                </ButtonLink>
                <ButtonLink href="#how" size="lg" variant="light">How it works</ButtonLink>
              </>
            ) : (
              <div className="w-full max-w-md">
                <WaitlistForm context="landing" />
              </div>
            )}
          </div>
          <p className="mt-5 max-w-xl text-sm font-semibold text-ink-soft">
            ✨ Our rescue stories are fictional and AI-generated. Adoptions are virtual only — no real animals, no donations.
          </p>
        </div>
        {featured && (
          <div className="pop-in">
            <HeroScene animal={featured} />
          </div>
        )}
      </section>

      {/* ------------------------------------------------ rescues */}
      <section id="rescues" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <SectionTitle eyebrow="The rescues" title="Meet the residents">
          Each character comes from its own fictional rescue episode. New rescues arrive with every new video.
        </SectionTitle>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {animals.map((a) => (
            <div key={a.id} className="w-[78%] shrink-0 snap-center sm:w-auto">
              <AnimalCard animal={a} href={rescueByAnimal.has(a.id) ? `/r/${rescueByAnimal.get(a.id)}` : undefined} />
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ how it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <SectionTitle eyebrow="How it works" title="From story to sanctuary" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["🎬", "Watch the story", "Spot a rescue on TikTok, Instagram or Facebook and tap the link."],
            ["🐾", "Adopt virtually", "Sign in with your email and adopt the exact animal from the video — free."],
            ["🫐", "Care & bond", "Comfort, snack, play and rest. Earn bond XP and acorns, unlock chapters."],
            ["🏡", "Build a sanctuary", "Spend acorns on cozy decorations and come back for every new rescue."],
          ].map(([icon, title, text], i) => (
            <Card key={title} className="relative">
              <span className="absolute right-4 top-4 font-display text-4xl font-bold text-sage">{i + 1}</span>
              <div className="text-4xl" aria-hidden="true">{icon}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ promise */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 rounded-[2.5rem] bg-forest p-8 text-cream md:grid-cols-2 md:p-12">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">A kind game, by design</h2>
            <p className="mt-3 text-cream/85">
              Pawtopia is built to feel good. Your animals never get sick, never starve and never leave because you were
              busy. Every visit is a happy one.
            </p>
          </div>
          <ul className="grid gap-3 text-base font-semibold">
            {[
              "No pet illness, hunger timers or guilt mechanics",
              "No real-money purchases, ads or donations",
              "Clearly labelled fictional AI-generated stories",
              "Your progress is always saved — and always yours",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <span aria-hidden="true">💚</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
