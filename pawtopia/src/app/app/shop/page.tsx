import type { Metadata } from "next";
import { ShopGrid } from "@/components/game/ShopGrid";
import { getEconomy, listDecor } from "@/lib/data/catalog";
import { getSanctuary, getWallet } from "@/lib/data/player";
import { SyncBalance } from "@/components/game/GameState";

export const metadata: Metadata = { title: "Acorn shop" };

export default async function ShopPage() {
  const [items, sanctuary, economy, balance] = await Promise.all([listDecor(), getSanctuary(), getEconomy(), getWallet()]);
  return (
    <div className="grid gap-5">
      <SyncBalance value={balance} />
      <div>
        <h1 className="font-display text-3xl font-bold">Acorn shop 🛍️</h1>
        <p className="mt-1 text-ink-soft">
          Cozy cosmetics for your sanctuary. Earn acorns by caring for your animals — your first{" "}
          {economy.daily_acorn_actions} different activities each day earn acorns. Acorns are virtual only and can never be bought with real money.
        </p>
      </div>
      <ShopGrid items={items} owned={(sanctuary?.inventory ?? []).map((i) => i.slug)} />
    </div>
  );
}
