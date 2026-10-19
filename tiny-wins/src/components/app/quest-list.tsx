"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pip } from "@/components/pip/pip";
import { QuestCard } from "@/components/quests/quest-card";
import { Button } from "@/components/ui/button";
import { completeQuestAction, swapQuestAction } from "@/lib/actions/game";
import type { QuestDay } from "@/lib/game/types";
import { useCelebration } from "./celebration";
import { NewQuestsCountdown } from "./countdown";

type Props = { day: QuestDay; level: number; timezone: string; compact?: boolean; allowSwap?: boolean };

export function QuestList({ day, level, timezone, compact = false, allowSwap = false }: Props) {
  const { celebrateRewards } = useCelebration();
  const [justDone, setJustDone] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const baseDone = new Set(day.quests.filter((q) => q.completedAt).map((q) => q.id));
  const [done, markDone] = useOptimistic(baseDone, (s: Set<string>, id: string) => new Set(s).add(id));

  const allDone = day.quests.length > 0 && day.quests.every((q) => done.has(q.id));

  function complete(id: string) {
    if (busyId) return;
    setBusyId(id);
    startTransition(async () => {
      markDone(id);
      setJustDone(id);
      const res = await completeQuestAction(id);
      setBusyId(null);
      if (!res.ok) {
        setJustDone(null);
        toast.error(res.error);
        return;
      }
      if (res.data.status === "completed") celebrateRewards({ ...res.data, previousLevel: level });
    });
  }

  function swap(id: string) {
    if (busyId) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await swapQuestAction(id);
      setBusyId(null);
      if (!res.ok) toast.error(res.error);
      else toast("🔀 Quest swapped!", { description: "You get one swap per day." });
    });
  }

  if (day.quests.length === 0) {
    return <p className="rounded-3xl bg-muted p-6 text-center text-muted-foreground">No quests available right now. Please check back soon!</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-forest to-hoodie p-4 text-white shadow-lift"
          >
            <Pip pose="cheer" size={80} />
            <div className="flex-1">
              <p className="font-display text-xl font-bold">All three done!</p>
              <p className="text-sm text-white/90">
                That&apos;s a full day of tiny wins. <NewQuestsCountdown timezone={timezone} prefix="Fresh quests in" />.
              </p>
              {!compact && (
                <Button asChild variant="honey" size="sm" className="mt-2">
                  <Link href="/shop">Spend your acorns</Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {day.quests.map((q) => (
        <QuestCard
          key={q.id}
          compact={compact}
          quest={{
            id: q.id,
            title: q.title,
            description: q.description,
            category: q.category,
            minutes: q.minutes,
            icon: q.icon,
            xp: q.xp,
            acorns: q.acorns,
            completed: done.has(q.id),
          }}
          pending={busyId === q.id}
          justCompleted={justDone === q.id}
          onComplete={() => complete(q.id)}
          onSwap={allowSwap && day.swapAvailable ? () => swap(q.id) : undefined}
        />
      ))}
    </div>
  );
}
