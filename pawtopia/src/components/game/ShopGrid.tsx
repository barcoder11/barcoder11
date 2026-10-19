"use client";
import Link from "next/link";
import { useState } from "react";
import { DecorArt } from "@/components/art/DecorArt";
import { buyDecor, type ShopResult } from "@/app/app/actions";
import { AcornIcon, Button, Notice } from "@/components/ui";
import { tryAction } from "@/lib/safe-action";
import { useGameState } from "./GameState";
import type { Decor } from "@/lib/types";

const CATEGORY: Record<Decor["slot_category"], string> = { small: "Small", large: "Big", hanging: "Hanging" };

export function ShopGrid({ items, owned }: { items: Decor[]; owned: string[] }) {
  const { balance, setBalance } = useGameState();
  const [ownedSet, setOwned] = useState(new Set(owned));
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string; slug?: string } | null>(null);

  async function buy(item: Decor) {
    if (buying) return;
    setBuying(item.slug);
    const key = crypto.randomUUID();
    // On a network hiccup, retry once with the same key (idempotent: never charges twice).
    const res: ShopResult =
      (await tryAction(() => buyDecor(item.slug, key))) ?? (await tryAction(() => buyDecor(item.slug, key))) ?? { status: "error" };
    setBuying(null);
    if (typeof res.balance === "number") setBalance(res.balance);
    if (res.status === "purchased" || res.status === "replay") {
      setOwned((s) => new Set(s).add(item.slug));
      setMessage({ tone: "success", text: `${item.name} is yours!`, slug: item.slug });
    } else if (res.status === "already_owned") {
      setOwned((s) => new Set(s).add(item.slug));
      setMessage({ tone: "info", text: `You already own the ${item.name}.` });
    } else if (res.status === "insufficient_funds") {
      setMessage({ tone: "error", text: `You need ${item.price - (res.balance ?? balance)} more acorns. Care for your animals to earn more!` });
    } else {
      setMessage({ tone: "error", text: "That purchase didn't go through. Please try again." });
    }
  }

  return (
    <div className="grid gap-4">
      {message && (
        <Notice tone={message.tone} className="flex flex-wrap items-center justify-between gap-2">
          <span>{message.text}</span>
          {message.slug && <Link href="/app/sanctuary" className="font-bold underline">Place it in your sanctuary →</Link>}
        </Notice>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const isOwned = ownedSet.has(item.slug);
          const affordable = balance >= item.price;
          return (
            <li key={item.slug} className="flex flex-col rounded-[1.5rem] bg-white p-3 shadow-soft ring-1 ring-ink/5" data-testid={`shop-${item.slug}`}>
              <div className="relative grid aspect-square place-items-center rounded-[1.1rem] bg-gradient-to-b from-sage to-cream">
                <DecorArt artKey={item.art_key} title={item.name} className="h-[70%] w-[70%]" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-soft">
                  {CATEGORY[item.slot_category]}
                </span>
              </div>
              <h2 className="mt-2 font-display text-lg font-bold leading-tight">{item.name}</h2>
              <p className="line-clamp-2 flex-1 text-xs text-ink-soft">{item.description}</p>
              <div className="mt-2">
                {isOwned ? (
                  <span className="flex h-9 items-center justify-center rounded-full bg-sage text-sm font-bold text-forest">✓ Owned</span>
                ) : (
                  <Button
                    size="sm"
                    variant={affordable ? "honey" : "light"}
                    className="w-full"
                    disabled={buying !== null}
                    onClick={() => buy(item)}
                    aria-label={`Buy ${item.name} for ${item.price} acorns`}
                  >
                    {buying === item.slug ? "…" : (
                      <>
                        <AcornIcon className="h-4 w-4" /> {item.price}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
