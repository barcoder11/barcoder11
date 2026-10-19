"use client";

import { Check, Paintbrush, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ItemPreview } from "@/components/shop/item-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { equipItemAction, unequipSlotAction } from "@/lib/actions/game";
import type { RoomLayout, RoomSlot, ShopItem } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { SLOT_LABELS } from "./slots";
import { TreehouseScene } from "./treehouse-scene";

type Props = { layout: RoomLayout; level: number; items: ShopItem[]; owned: string[] };

type Change = { slot: RoomSlot; itemId: string | null };

export function TreehouseEditor({ layout, level, items, owned }: Props) {
  const [editing, setEditing] = useState(false);
  const [slot, setSlot] = useState<RoomSlot | null>(null);
  const [, startTransition] = useTransition();
  const [room, applyChange] = useOptimistic(layout, (cur: RoomLayout, c: Change) => {
    const next = { ...cur };
    if (c.itemId) next[c.slot] = c.itemId;
    else delete next[c.slot];
    return next;
  });

  const ownedSet = new Set(owned);
  const forSlot = slot ? items.filter((i) => i.slot === slot && ownedSet.has(i.id)) : [];
  const lockedCount = slot ? items.filter((i) => i.slot === slot && !ownedSet.has(i.id)).length : 0;

  function place(item: ShopItem) {
    startTransition(async () => {
      applyChange({ slot: item.slot, itemId: item.id });
      const res = await equipItemAction(item.id);
      if (!res.ok) toast.error(res.error);
    });
    setSlot(null);
  }

  function clear(s: RoomSlot) {
    startTransition(async () => {
      applyChange({ slot: s, itemId: null });
      const res = await unequipSlotAction(s);
      if (!res.ok) toast.error(res.error);
    });
    setSlot(null);
  }

  return (
    <div>
      <div className="relative">
        <TreehouseScene layout={room} level={level} editMode={editing} selectedSlot={slot} onSlotSelect={setSlot} className="max-w-[560px]" />
        {editing && (
          <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-max rounded-full bg-card/90 px-3 py-1 text-sm font-bold shadow-soft">
            Tap a spot to decorate
          </p>
        )}
      </div>

      <div className="mx-auto mt-4 flex max-w-[560px] gap-2">
        <Button className="flex-1" variant={editing ? "secondary" : "default"} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          {editing ? (
            <>
              <Check /> Done decorating
            </>
          ) : (
            <>
              <Paintbrush /> Decorate
            </>
          )}
        </Button>
        <Button asChild variant="honey" className="flex-1">
          <Link href="/shop">
            <ShoppingBag /> Shop
          </Link>
        </Button>
      </div>

      <Dialog open={slot !== null} onOpenChange={(o) => !o && setSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{slot ? SLOT_LABELS[slot] : ""}</DialogTitle>
            <DialogDescription>
              {forSlot.length ? "Pick what goes here." : "You don't own anything for this spot yet."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {forSlot.map((item) => {
              const active = slot ? room[slot] === item.id : false;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (active ? null : place(item))}
                  aria-pressed={active}
                  className={cn(
                    "press-3d flex flex-col items-center gap-1 rounded-2xl border-2 bg-card p-2 text-center text-sm font-bold",
                    active ? "border-primary bg-sage/50 dark:bg-secondary/50" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="block aspect-square w-full rounded-xl bg-muted p-1.5">
                    <ItemPreview itemId={item.id} slot={item.slot} />
                  </span>
                  {item.name}
                  {active && <span className="text-xs text-primary">Placed</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {slot && room[slot] && (
              <Button variant="outline" className="flex-1" onClick={() => clear(slot)}>
                <X /> Leave empty
              </Button>
            )}
            {lockedCount > 0 && (
              <Button asChild variant="honey" className="flex-1">
                <Link href="/shop">
                  <ShoppingBag /> {lockedCount} more in the shop
                </Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
