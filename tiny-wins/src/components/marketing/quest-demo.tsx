"use client";

import { useState } from "react";
import { AcornIcon, XpIcon } from "@/components/brand/icons";
import { Pip } from "@/components/pip/pip";
import { QuestCard, type QuestCardData } from "@/components/quests/quest-card";
import { Progress } from "@/components/ui/progress";

const SAMPLE: QuestCardData[] = [
  { id: "a", title: "Make your bed", description: "Pull the covers up. Fluff the pillow. Done!", category: "organization", minutes: 2, icon: "🛏️", xp: 10, acorns: 6, completed: false },
  { id: "b", title: "Walk for 5 minutes", description: "Any pace counts. Around the block or the hallway.", category: "fitness", minutes: 5, icon: "🚶", xp: 15, acorns: 8, completed: false },
  { id: "c", title: "Do something kind", description: "Hold a door, share a compliment, help someone out.", category: "kindness", minutes: 2, icon: "💛", xp: 15, acorns: 8, completed: false },
];

/** Landing-page demo. Runs entirely in the browser; nothing is saved. */
export function QuestDemo() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<string | null>(null);
  const xp = SAMPLE.filter((q) => done.has(q.id)).reduce((s, q) => s + q.xp, 0);
  const acorns = SAMPLE.filter((q) => done.has(q.id)).reduce((s, q) => s + q.acorns, 0);
  const all = done.size === SAMPLE.length;

  return (
    <div className="relative rounded-[2rem] border border-border/60 bg-card/70 p-4 shadow-lift backdrop-blur sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Pip pose={all ? "cheer" : done.size ? "happy" : "wave"} size={72} />
        <div className="flex-1">
          <p className="font-display text-lg font-bold">{all ? "All three! Pip is SO proud." : "Try it: tap a quest"}</p>
          <div className="mt-1.5 flex items-center gap-3 text-sm font-bold">
            <span className="inline-flex items-center gap-1"><XpIcon className="size-4" /> {xp} XP</span>
            <span className="inline-flex items-center gap-1"><AcornIcon className="size-4" /> {acorns}</span>
            <span className="text-muted-foreground">{done.size}/3 today</span>
          </div>
          <Progress value={(done.size / 3) * 100} className="mt-2 h-2.5" aria-label="Demo quests completed" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {SAMPLE.map((q) => (
          <QuestCard
            key={q.id}
            compact
            quest={{ ...q, completed: done.has(q.id) }}
            justCompleted={last === q.id}
            onComplete={() => {
              setDone((d) => new Set(d).add(q.id));
              setLast(q.id);
            }}
          />
        ))}
      </div>
      {done.size > 0 && (
        <button
          type="button"
          className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            setDone(new Set());
            setLast(null);
          }}
        >
          Reset demo
        </button>
      )}
    </div>
  );
}
