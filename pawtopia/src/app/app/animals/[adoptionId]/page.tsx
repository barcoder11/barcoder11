import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CareRoom } from "@/components/game/CareRoom";
import { SyncBalance } from "@/components/game/GameState";
import { assetMap, getChapterOutline, getEconomy } from "@/lib/data/catalog";
import { getAdoption, getLastCareTimes, getWallet } from "@/lib/data/player";
import { getSceneData } from "@/lib/data/scene";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Animal room" };

export default async function AnimalRoomPage({ params, searchParams }: PageProps<"/app/animals/[adoptionId]">) {
  const { adoptionId } = await params;
  const sp = await searchParams;
  const adoption = await getAdoption(adoptionId);
  if (!adoption?.animals) notFound();
  const animal = adoption.animals;
  const [economy, lastTimes, scene, outline, balance] = await Promise.all([
    getEconomy(),
    getLastCareTimes(adoption.id),
    getSceneData(),
    getChapterOutline(animal.id),
    getWallet(),
  ]);

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
    />
    </>
  );
}
