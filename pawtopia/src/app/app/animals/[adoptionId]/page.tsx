import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CareRoom } from "@/components/game/CareRoom";
import { SyncBalance } from "@/components/game/GameState";
import { getChapterOutline, getEconomy, listRescuesForAnimal } from "@/lib/data/catalog";
import { assetMap } from "@/lib/animals";
import { getProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { getAcornActivitiesToday, getAdoption, getLastCareTimes, getWallet } from "@/lib/data/player";
import { getSceneData } from "@/lib/data/scene";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Animal room" };

export default async function AnimalRoomPage({ params, searchParams }: PageProps<"/app/animals/[adoptionId]">) {
  const { adoptionId } = await params;
  const sp = await searchParams;
  const adoption = await getAdoption(adoptionId);
  if (!adoption?.animals) notFound();
  const animal = adoption.animals;
  const profile = await getProfile();
  const [economy, lastTimes, scene, outline, balance, rescues, acornActivities] = await Promise.all([
    getEconomy(),
    getLastCareTimes(adoption.id),
    getSceneData(),
    getChapterOutline(animal.id),
    getWallet(),
    listRescuesForAnimal(animal.id),
    getAcornActivitiesToday(profile?.timezone ?? "UTC"),
  ]);
  const shareUrl = rescues[0]
    ? `${env.siteUrl}/r/${rescues[0].slug}?utm_source=share&utm_medium=player`
    : `${env.siteUrl}/animals/${animal.slug}?utm_source=share&utm_medium=player`;

  return (
    <>
      <SyncBalance value={balance} />
      <CareRoom
      adoption={{
        id: adoption.id,
        nickname: adoption.nickname,
        bond_xp: adoption.bond_xp,
        level: adoption.level,
        phase: adoption.phase,
        care_count: adoption.care_count,
      }}
      animal={{ name: animal.name, species: animal.species, placeholder_style: animal.placeholder_style, colors: animal.colors }}
      assets={assetMap(animal)}
      economy={economy}
      lastTimes={lastTimes}
      serverNow={nowMs()}
      scene={{ style: scene.style, slots: scene.slots, placements: scene.placements, decorBySlug: scene.decorBySlug }}
      outline={outline}
      welcome={sp.welcome === "1"}
      shareUrl={shareUrl}
      acornActivitiesToday={acornActivities}
    />
    </>
  );
}
