"use client";

import { Lock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useCelebration } from "@/components/app/celebration";
import { AcornIcon } from "@/components/brand/icons";
import { SLOT_LABELS } from "@/components/treehouse/slots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equipItemAction, purchaseItemAction } from "@/lib/actions/game";
import { SHOP_CATEGORIES } from "@/lib/game/constants";
import type { RoomLayout, ShopCategory, ShopItem } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { ItemPreview } from "./item-preview";

type Props = { items: ShopItem[]; owned: string[]; layout: RoomLayout; acorns: number; level: number };

export function ShopView({ items, owned, layout, acorns, level }: Props) {
  const [category, setCategory] = useState<ShopCategory | "all">("all");
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { celebrateRewards } = useCelebration();
  const ownedSet = new Set(owned);
  const placed = new Set(Object.values(layout));

  const shown = items.filter((i) => !i.is_starter && (category === "all" || i.category === category));

  function buy(item: ShopItem) {
    startTransition(async () => {
      const res = await purchaseItemAction(item.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setJustBought(item.id);
      toast.success(`${item.name} is yours!`, {
        description: res.data.equipped ? "We placed it in your treehouse." : "Place it from the treehouse whenever you like.",
        icon: "🎁",
      });
      if (res.data.achievements.length) celebrateRewards({ achievements: res.data.achievements });
      setSelected(null);
    });
  }

  function place(item: ShopItem) {
    startTransition(async () => {
      const res = await equipItemAction(item.id);
      if (!res.ok) toast.error(res.error);
      else toast.success(`${item.name} placed!`);
      setSelected(null);
    });
  }

  const sel = selected;
  const selOwned = sel ? ownedSet.has(sel.id) : false;
  const selLocked = sel ? sel.unlock_level > level : false;
  const selAfford = sel ? acorns >= sel.price : false;

  return (
    <div>
      <Tabs value={category} onValueChange={(v) => setCategory(v as ShopCategory | "all")}>
        <TabsList aria-label="Shop categories">
          {SHOP_CATEGORIES.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((item) => {
          const isOwned = ownedSet.has(item.id);
          const locked = item.unlock_level > level;
          const affordable = acorns >= item.price;
          return (
            <motion.li key={item.id} layout initial={false}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className={cn(
                  "press-3d group flex h-full w-full flex-col rounded-3xl border-2 bg-card p-3 text-left transition-colors",
                  isOwned ? "border-forest/30" : "border-border/70 hover:border-primary/40",
                )}
                aria-label={`${item.name}, ${isOwned ? "owned" : locked ? `unlocks at level ${item.unlock_level}` : `${item.price} acorns`}`}
              >
                <span className={cn("relative block aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted to-muted/40 p-3", locked && "opacity-60 grayscale")}>
                  <motion.span
                    className="block h-full w-full"
                    animate={justBought === item.id ? { scale: [1, 1.15, 1], rotate: [0, -4, 4, 0] } : undefined}
                    transition={{ duration: 0.6 }}
                  >
                    <ItemPreview itemId={item.id} slot={item.slot} />
                  </motion.span>
                  {locked && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold shadow-soft">
                        <Lock className="size-3.5" /> Lv {item.unlock_level}
                      </span>
                    </span>
                  )}
                </span>
                <span className="mt-2 block font-display leading-tight font-semibold">{item.name}</span>
                <span className="text-xs text-muted-foreground">{SLOT_LABELS[item.slot]}</span>
                <span className="mt-auto pt-2">
                  {isOwned ? (
                    <Badge variant="sage">{placed.has(item.id) ? "In your treehouse" : "Owned"}</Badge>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1 font-extrabold", !affordable && !locked && "text-muted-foreground")}>
                      <AcornIcon className="size-4" /> {item.price}
                    </span>
                  )}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <Dialog open={Boolean(sel)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {sel && (
            <>
              <div className="mx-auto aspect-square w-44 rounded-3xl bg-gradient-to-b from-sage/70 to-muted p-5 dark:from-secondary">
                <ItemPreview itemId={sel.id} slot={sel.slot} />
              </div>
              <DialogHeader className="pr-0 text-center">
                <DialogTitle className="text-center">{sel.name}</DialogTitle>
                <DialogDescription className="text-center">{sel.description}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center gap-2 text-sm">
                <Badge variant="muted">{SLOT_LABELS[sel.slot]}</Badge>
                {!selOwned && (
                  <Badge variant="honey">
                    <AcornIcon /> {sel.price}
                  </Badge>
                )}
              </div>
              <DialogFooter className="sm:justify-center">
                {selOwned ? (
                  placed.has(sel.id) ? (
                    <Button asChild variant="secondary" className="w-full sm:w-auto">
                      <Link href="/treehouse">See it in the treehouse</Link>
                    </Button>
                  ) : (
                    <Button className="w-full sm:w-auto" onClick={() => place(sel)} disabled={pending}>
                      {pending ? "Placing…" : "Place in treehouse"}
                    </Button>
                  )
                ) : selLocked ? (
                  <p className="w-full text-center text-sm font-semibold text-muted-foreground">
                    🔒 Reach level {sel.unlock_level} to unlock this. Keep doing tiny wins!
                  </p>
                ) : (
                  <Button size="lg" variant="honey" className="w-full sm:w-auto" onClick={() => buy(sel)} disabled={!selAfford || pending}>
                    {pending ? "Buying…" : selAfford ? (
                      <>
                        Buy for <AcornIcon /> {sel.price}
                      </>
                    ) : (
                      `Need ${sel.price - acorns} more acorns`
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
