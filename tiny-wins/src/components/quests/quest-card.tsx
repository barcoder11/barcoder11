"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Shuffle } from "lucide-react";
import { AcornIcon, XpIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { GOAL_INFO } from "@/lib/game/constants";
import type { GoalId } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { RewardBurst } from "./reward-burst";

export type QuestCardData = {
  id: string;
  title: string;
  description: string;
  category: GoalId;
  minutes: number;
  icon: string;
  xp: number;
  acorns: number;
  completed: boolean;
};

type Props = {
  quest: QuestCardData;
  onComplete?: () => void;
  onSwap?: () => void;
  pending?: boolean;
  justCompleted?: boolean;
  compact?: boolean;
  className?: string;
};

export function QuestCard({ quest, onComplete, onSwap, pending, justCompleted, compact, className }: Props) {
  const goal = GOAL_INFO[quest.category];
  const done = quest.completed;

  return (
    <motion.article
      layout
      className={cn(
        "relative flex items-center gap-3 rounded-3xl border-2 bg-card p-3.5 shadow-soft transition-colors sm:gap-4 sm:p-4",
        done ? "border-forest/25 bg-sage/40 dark:bg-secondary/40" : "border-border/70",
        className,
      )}
      aria-label={`${quest.title}${done ? ", completed" : ""}`}
    >
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl text-2xl shadow-inner sm:size-14 sm:text-3xl",
          done && "grayscale-[30%]",
        )}
        style={{ background: `${goal.color}26` }}
        aria-hidden
      >
        {quest.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.7rem] font-bold uppercase tracking-wide" style={{ color: goal.color }}>
          {goal.label}
          <span className="inline-flex items-center gap-0.5 text-muted-foreground normal-case tracking-normal">
            <Clock className="size-3" aria-hidden /> {quest.minutes} min
          </span>
        </div>
        <h3 className={cn("font-display text-base leading-snug font-semibold sm:text-lg", done && "text-muted-foreground line-through decoration-2 decoration-forest/40")}>
          {quest.title}
        </h3>
        {!compact && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{quest.description}</p>}
        <div className="mt-1.5 flex items-center gap-3 text-sm font-bold">
          <span className="inline-flex items-center gap-1 text-[#B8860B] dark:text-honey">
            <XpIcon className="size-4" /> {quest.xp} XP
          </span>
          <span className="inline-flex items-center gap-1 text-bark dark:text-honey">
            <AcornIcon className="size-4" /> {quest.acorns}
          </span>
          {onSwap && !done && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs text-muted-foreground" onClick={onSwap} disabled={pending}>
              <Shuffle /> Swap
            </Button>
          )}
        </div>
      </div>

      <div className="relative shrink-0">
        <AnimatePresence initial={false}>{justCompleted && <RewardBurst />}</AnimatePresence>
        <motion.button
          type="button"
          onClick={onComplete}
          disabled={done || pending || !onComplete}
          whileTap={done ? undefined : { scale: 0.88 }}
          className={cn(
            "press-3d grid size-12 place-items-center rounded-2xl border-2 transition-colors disabled:cursor-default sm:size-14",
            done
              ? "border-forest bg-forest text-white"
              : "border-forest/30 bg-card text-forest hover:border-forest hover:bg-sage/60 dark:hover:bg-secondary",
            pending && "animate-pulse",
          )}
          aria-label={done ? `${quest.title} completed` : `Complete: ${quest.title}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span key="check" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                <Check className="size-7 stroke-[3.5]" />
              </motion.span>
            ) : (
              <motion.span key="empty" className="text-xs font-extrabold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Done?
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.article>
  );
}
