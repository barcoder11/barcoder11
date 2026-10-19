import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AnimalArt, PlaceholderBadge } from "@/components/art/AnimalArt";
import { SceneBackdrop } from "@/components/art/SceneBackdrop";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { Card, FictionDisclosure, Notice } from "@/components/ui";
import { getIsEditor, requirePlayer } from "@/lib/auth";
import { getMyAdoptionId } from "@/lib/data/adoption-status";
import { assetMap, getAnimalBySlug, getEconomy, getLaunchSettings } from "@/lib/data/catalog";
import { AdoptForm } from "./AdoptForm";

export const metadata: Metadata = { title: "Adopt", robots: { index: false } };

export default async function AdoptPage({ params }: PageProps<"/animals/[animalSlug]/adopt">) {
  const { animalSlug } = await params;
  await requirePlayer(`/animals/${animalSlug}/adopt`);
  const animal = await getAnimalBySlug(animalSlug);
  if (!animal) notFound();
  const existing = await getMyAdoptionId(animal.id);
  if (existing) redirect(`/app/animals/${existing}`);

  const [launch, isEditor, economy] = await Promise.all([getLaunchSettings(), getIsEditor(), getEconomy()]);
  const assets = assetMap(animal);
  const adoptable = animal.status === "published" || (isEditor && animal.status !== "archived");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-[5/4]">
          <SceneBackdrop style="forest" />
          <div className="absolute bottom-[4%] left-1/2 h-[78%] w-[62%] -translate-x-1/2">
            <AnimalArt animal={animal} assets={assets} state="happy" priority />
          </div>
          <PlaceholderBadge assets={assets} className="absolute right-3 top-3" />
        </div>
        <div className="grid gap-4 p-6">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-terracotta">Virtual adoption</p>
            <h1 className="font-display text-4xl font-bold">Welcome home, {animal.name}</h1>
            <p className="mt-2 text-ink-soft">
              {animal.name} will get a cozy corner in your sanctuary. You&apos;ll receive a welcome gift of{" "}
              <strong>{economy.welcome_acorns} acorns</strong> on your first adoption to start decorating.
            </p>
          </div>
          <FictionDisclosure compact />
          {!adoptable ? (
            <Notice>{animal.name} isn&apos;t available for adoption yet.</Notice>
          ) : launch.mode !== "open" && !isEditor ? (
            <>
              <Notice>Adoptions open soon. Join the waitlist and we&apos;ll let you know!</Notice>
              <WaitlistForm source={{ source: "adopt_page" }} />
            </>
          ) : (
            <AdoptForm slug={animal.slug} name={animal.name} />
          )}
        </div>
      </Card>
    </div>
  );
}
