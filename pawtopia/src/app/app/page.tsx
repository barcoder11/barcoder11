import type { Metadata } from "next";
import Link from "next/link";
import { AnimalArt } from "@/components/art/AnimalArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { AnimalCard } from "@/components/marketing/AnimalCard";
import { ButtonLink, Card } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { assetMap, getEconomy, listCatalogAnimals } from "@/lib/data/catalog";
import { getWallet, listAdoptions } from "@/lib/data/player";
import { SyncBalance } from "@/components/game/GameState";
import { levelProgress, phaseLabel } from "@/lib/game";

export const metadata: Metadata = { title: "My animals" };

/** Time-of-day greeting in the player's own time zone (the server runs in UTC). */
function greetingFor(timeZone: string) {
  let hour: number;
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  } catch {
    hour = new Date().getUTCHours();
  }
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const [profile, adoptions, catalog, economy, balance] = await Promise.all([getProfile(), listAdoptions(), listCatalogAnimals(), getEconomy(), getWallet()]);
  const adoptedIds = new Set(adoptions.map((a) => a.animal_id));
  const newRescues = catalog.filter((a) => a.status === "published" && !adoptedIds.has(a.id));
  const comingSoon = catalog.filter((a) => a.status === "coming_soon");
  const greeting = greetingFor(profile?.timezone ?? "UTC");

  return (
    <div className="grid gap-8">
      <SyncBalance value={balance} />
      <section>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          {greeting}{profile?.display_name ? `, ${profile.display_name}` : ""}! 🌿
        </h1>
        <p className="mt-1 text-ink-soft">
          {adoptions.length > 0 ? "Your animals are happy to see you." : "Your sanctuary is ready for its first resident."}
        </p>
      </section>

      {adoptions.length === 0 ? (
        <Card className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold">Adopt your first animal</h2>
            <p className="mt-1 text-ink-soft">Every rescue deserves a new beginning — pick a friend below to get started.</p>
          </div>
          {newRescues[0] && <ButtonLink href={`/animals/${newRescues[0].slug}/adopt`}>🐾 Adopt {newRescues[0].name}</ButtonLink>}
        </Card>
      ) : (
        <section aria-labelledby="my-animals">
          <h2 id="my-animals" className="mb-3 font-display text-2xl font-bold">My animals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {adoptions.map((a) => {
              const animal = a.animals!;
              const prog = levelProgress(a.bond_xp, economy.level_thresholds);
              return (
                <Link
                  key={a.id}
                  href={`/app/animals/${a.id}`}
                  className="group flex items-center gap-4 rounded-[1.75rem] bg-white p-3 pr-5 shadow-soft ring-1 ring-ink/5 transition hover:-translate-y-0.5"
                  data-testid="my-animal"
                >
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.25rem]">
                    <SceneBackdrop style="forest" />
                    <div className="absolute inset-x-1 bottom-0 top-3">
                      <AnimalArt animal={animal} assets={assetMap(animal)} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-terracotta">{phaseLabel(a.phase)}</p>
                    <p className="truncate font-display text-2xl font-bold">{a.nickname || animal.name}</p>
                    <p className="text-sm text-ink-soft">Level {prog.level} · {a.bond_xp} bond XP</p>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sage">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#E8577A] to-honey" style={{ width: `${prog.pct}%` }} />
                    </div>
                    <p className="mt-2 font-display text-sm font-semibold text-forest group-hover:underline">Visit →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {newRescues.length > 0 && (
        <section aria-labelledby="new-rescues">
          <h2 id="new-rescues" className="mb-3 font-display text-2xl font-bold">New rescues to meet</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newRescues.map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
        </section>
      )}

      {comingSoon.length > 0 && (
        <section aria-labelledby="coming-soon">
          <h2 id="coming-soon" className="mb-1 font-display text-2xl font-bold">Arriving soon</h2>
          <p className="mb-3 text-sm text-ink-soft">Each new rescue episode brings a new friend. Check back after the next video!</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {comingSoon.map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
