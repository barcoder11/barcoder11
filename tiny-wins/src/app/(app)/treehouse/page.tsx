import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { TreehouseEditor } from "@/components/treehouse/treehouse-editor";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventory, getProfile, getRoomLayout, getShopItems } from "@/lib/data/queries";
import { TIER_INFO, treehouseTier } from "@/lib/game/levels";

export const metadata: Metadata = { title: "Treehouse" };

export default function TreehousePage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto aspect-[4/5] w-full max-w-[560px] rounded-[2rem]" />}>
      <TreehouseContent />
    </Suspense>
  );
}

async function TreehouseContent() {
  const [profile, layout, items, owned] = await Promise.all([getProfile(), getRoomLayout(), getShopItems(), getInventory()]);
  const tier = treehouseTier(profile.level);
  const info = TIER_INFO[tier];
  const placed = Object.keys(layout).length;
  const decorationsOwned = items.filter((i) => owned.has(i.id) && !i.is_starter).length;
  const totalDecorations = items.filter((i) => !i.is_starter).length;

  return (
    <div>
      <PageHeader title="Pip's treehouse" subtitle={`${info.name} · ${placed} of 12 spots decorated`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <TreehouseEditor layout={layout} level={profile.level} items={items} owned={[...owned]} />
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-sm font-extrabold tracking-wide text-primary uppercase">Treehouse stage {tier}/4</p>
            <p className="mt-1 font-display text-xl font-bold">{info.name}</p>
            <p className="text-sm text-muted-foreground">{info.unlock}</p>
            {info.nextAt ? (
              <>
                <Progress value={Math.min(100, (profile.level / info.nextAt) * 100)} className="mt-3 h-2.5" aria-label="Progress to next stage" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Next: {TIER_INFO[(tier + 1) as 2 | 3 | 4].name} at level {info.nextAt}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-semibold">Fully grown. Pip has never been prouder. 🌳</p>
            )}
          </Card>
          <Card className="p-5">
            <p className="font-display text-lg font-bold">Collection</p>
            <p className="text-sm text-muted-foreground">
              {decorationsOwned} of {totalDecorations} decorations
            </p>
            <Progress value={(decorationsOwned / Math.max(totalDecorations, 1)) * 100} className="mt-3 h-2.5" aria-label="Decorations collected" />
          </Card>
          <Card className="p-5 text-sm text-muted-foreground">
            💡 Tap Pip to say hi. The sky outside follows your local time, so visit at night to see the stars.
          </Card>
        </div>
      </div>
    </div>
  );
}
