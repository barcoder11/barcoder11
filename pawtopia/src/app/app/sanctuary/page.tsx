import type { Metadata } from "next";
import { SanctuaryEditor } from "@/components/game/SanctuaryEditor";
import { assetMap } from "@/lib/animals";
import { getWallet, listAdoptions } from "@/lib/data/player";
import { SyncBalance } from "@/components/game/GameState";
import { getSceneData } from "@/lib/data/scene";

export const metadata: Metadata = { title: "Sanctuary" };

export default async function SanctuaryPage() {
  const [scene, adoptions, balance] = await Promise.all([getSceneData(), listAdoptions(), getWallet()]);
  return (
    <>
      <SyncBalance value={balance} />
      <SanctuaryEditor
      name={scene.name}
      sceneStyle={scene.style}
      slots={scene.slots}
      placements={scene.placements}
      inventory={scene.inventory}
      decorBySlug={scene.decorBySlug}
      residents={adoptions.map((a) => ({
        id: a.id,
        name: a.nickname || a.animals!.name,
        animal: a.animals!,
        assets: assetMap(a.animals!),
      }))}
    />
    </>
  );
}
