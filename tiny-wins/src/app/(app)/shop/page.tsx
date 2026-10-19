import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { AcornIcon } from "@/components/brand/icons";
import { ShopView } from "@/components/shop/shop-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventory, getProfile, getRoomLayout, getShopItems } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Decoration shop" };

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
          ))}
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

async function ShopContent() {
  const [profile, items, owned, layout] = await Promise.all([getProfile(), getShopItems(), getInventory(), getRoomLayout()]);
  return (
    <div>
      <PageHeader
        title="Decoration shop"
        subtitle="Spend acorns to make the treehouse cozier."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-honey/60 px-4 py-2 font-display text-lg font-bold text-bark-deep shadow-soft dark:bg-accent dark:text-honey">
            <AcornIcon /> {profile.acorns.toLocaleString()}
          </span>
        }
      />
      <ShopView items={items} owned={[...owned]} layout={layout} acorns={profile.acorns} level={profile.level} />
    </div>
  );
}
