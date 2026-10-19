import type { Metadata } from "next";
import Link from "next/link";
import { AnimalArt } from "@/components/art/AnimalArt";
import { ButtonLink, Card } from "@/components/ui";
import { assetMap, getChapterOutline } from "@/lib/data/catalog";
import { getUnlockedChapters, listAdoptions } from "@/lib/data/player";
import { personalize, PHASES } from "@/lib/game";

export const metadata: Metadata = { title: "Stories" };


export default async function StoriesPage() {
  const [adoptions, unlocked] = await Promise.all([listAdoptions(), getUnlockedChapters()]);
  if (adoptions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-5xl" aria-hidden="true">📖</div>
        <h1 className="mt-2 font-display text-2xl font-bold">Your story album is empty</h1>
        <p className="mt-1 text-ink-soft">Adopt an animal to start unlocking their recovery chapters.</p>
        <ButtonLink href="/app" className="mt-4">Meet the animals</ButtonLink>
      </Card>
    );
  }
  const outlines = await Promise.all(adoptions.map((a) => getChapterOutline(a.animal_id)));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Story album 📖</h1>
        <p className="mt-1 text-ink-soft">Recovery chapters unlock as your bond grows. Every story here is fictional.</p>
      </div>
      {adoptions.map((a, idx) => {
        const animal = a.animals!;
        const name = a.nickname || animal.name;
        const mine = unlocked.filter((c) => c.user_animal_id === a.id);
        const outline = outlines[idx];
        const complete = a.phase === "new_beginning";
        return (
          <section key={a.id} aria-labelledby={`story-${a.id}`} className="grid gap-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-sage">
                <AnimalArt animal={animal} assets={assetMap(animal)} />
              </div>
              <div>
                <h2 id={`story-${a.id}`} className="font-display text-2xl font-bold">{name}&apos;s journey</h2>
                <p className="text-sm text-ink-soft">{mine.length} of {outline.length} chapters unlocked</p>
              </div>
            </div>
            {/* phase path */}
            <ol className="flex flex-wrap items-center gap-1" aria-label="Recovery phases">
              {PHASES.map((p, i) => {
                const reached = PHASES.findIndex((x) => x.id === a.phase) >= i;
                return (
                  <li key={p.id} className="flex items-center gap-1">
                    <span
                      className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ${reached ? "bg-forest text-cream" : "bg-white text-ink-soft ring-1 ring-ink/10"}`}
                    >
                      <span aria-hidden="true">{p.emoji}</span> {p.label}
                      <span className="sr-only">{reached ? "(reached)" : "(not yet)"}</span>
                    </span>
                    {i < PHASES.length - 1 && <span className="h-0.5 w-4 bg-ink/15" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
            {complete && (
              <Card className="bg-gradient-to-br from-[#2b3f63] to-[#183027] text-cream">
                <p className="text-xs font-extrabold uppercase tracking-widest text-honey">🌙 Memory Meadow</p>
                <p className="mt-1 font-display text-xl font-bold">{name} has reached a New Beginning</p>
                <p className="mt-1 text-sm text-cream/80">
                  {name} will always have a home here — visit anytime, and keep your collectible badge forever.
                </p>
              </Card>
            )}
            <div className="grid gap-3">
              {outline.map((o) => {
                const chapter = mine.find((c) => c.ordinal === o.ordinal);
                const phase = PHASES.find((p) => p.id === o.phase);
                return chapter ? (
                  <article key={o.ordinal} id={`chapter-${a.id}-${o.ordinal}`} className="scroll-mt-24 rounded-[1.5rem] bg-white p-5 shadow-soft ring-1 ring-ink/5">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-terracotta">
                      {phase?.emoji} Chapter {o.ordinal} · {phase?.label}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold">{chapter.title}</h3>
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">
                      {personalize(chapter.body, animal.name, name)}
                    </p>
                  </article>
                ) : (
                  <div key={o.ordinal} className="flex items-center gap-3 rounded-[1.5rem] border-2 border-dashed border-ink/10 px-5 py-4 text-ink-soft">
                    <span className="text-xl" aria-hidden="true">🔒</span>
                    <div>
                      <p className="font-display font-semibold">Chapter {o.ordinal}: {o.title}</p>
                      <p className="text-xs">Unlocks at {o.unlock_bond_xp} bond XP ({Math.max(0, o.unlock_bond_xp - a.bond_xp)} to go)</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href={`/app/animals/${a.id}`} className="font-bold text-forest hover:underline">Visit {name} →</Link>
          </section>
        );
      })}
    </div>
  );
}
