"use client";

import { motion } from "motion/react";
import { createContext, useCallback, useContext, useState } from "react";
import { toast } from "sonner";
import { AcornIcon } from "@/components/brand/icons";
import { Pip } from "@/components/pip/pip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TIER_INFO, treehouseTier } from "@/lib/game/levels";
import type { UnlockedAchievement } from "@/lib/game/types";

type LevelUp = { level: number; bonus: number };
type Ctx = {
  celebrateRewards: (r: {
    xpGained?: number;
    acornsGained?: number;
    leveledUp?: boolean;
    level?: number;
    levelBonus?: number;
    achievements?: UnlockedAchievement[];
    allDone?: boolean;
    previousLevel?: number;
  }) => void;
};

const CelebrationContext = createContext<Ctx>({ celebrateRewards: () => {} });
export const useCelebration = () => useContext(CelebrationContext);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [levelUp, setLevelUp] = useState<(LevelUp & { previousLevel: number }) | null>(null);

  const celebrateRewards: Ctx["celebrateRewards"] = useCallback((r) => {
    if (r.xpGained || r.acornsGained) {
      toast.success(`+${r.xpGained ?? 0} XP  ·  +${r.acornsGained ?? 0} acorns`, {
        description: r.allDone ? "All three quests done! Pip is doing a happy dance." : "Nice! That's a tiny win.",
        icon: <AcornIcon className="size-5" />,
      });
    }
    for (const a of r.achievements ?? []) {
      toast(`${a.icon} Achievement unlocked: ${a.title}`, { description: a.acorns ? `+${a.acorns} bonus acorns` : undefined });
    }
    if (r.leveledUp && r.level) {
      setLevelUp({ level: r.level, bonus: r.levelBonus ?? 0, previousLevel: r.previousLevel ?? r.level - 1 });
    }
  }, []);

  const tierUp = levelUp ? treehouseTier(levelUp.level) > treehouseTier(levelUp.previousLevel) : false;
  const tier = levelUp ? TIER_INFO[treehouseTier(levelUp.level)] : null;

  return (
    <CelebrationContext value={{ celebrateRewards }}>
      {children}
      <Dialog open={Boolean(levelUp)} onOpenChange={(o) => !o && setLevelUp(null)}>
        <DialogContent className="text-center" showClose={false}>
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className="mx-auto"
          >
            <Pip pose="cheer" size={160} />
          </motion.div>
          <DialogTitle className="text-3xl">Level {levelUp?.level}!</DialogTitle>
          <DialogDescription className="text-base">
            Pip grew a little more thanks to you.
            {levelUp?.bonus ? (
              <span className="mt-2 flex items-center justify-center gap-1.5 font-bold text-foreground">
                <AcornIcon /> +{levelUp.bonus} bonus acorns
              </span>
            ) : null}
          </DialogDescription>
          {tierUp && tier && (
            <div className="rounded-2xl bg-honey/50 p-4 text-left dark:bg-accent/50">
              <p className="font-display text-lg font-bold">🏡 Treehouse upgrade: {tier.name}</p>
              <p className="text-sm text-muted-foreground">{tier.unlock}</p>
            </div>
          )}
          <Button size="lg" onClick={() => setLevelUp(null)}>
            Yay!
          </Button>
        </DialogContent>
      </Dialog>
    </CelebrationContext>
  );
}
