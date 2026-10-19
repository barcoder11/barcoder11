import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewQuestsCountdown } from "@/components/app/countdown";
import { Greeting } from "@/components/app/greeting";
import { QuestList } from "@/components/app/quest-list";
import { AcornIcon } from "@/components/brand/icons";
import { Pip } from "@/components/pip/pip";
import type { PipPose } from "@/components/pip/pip-assets";
import { ItemPreview } from "@/components/shop/item-preview";
import { TreehouseScene } from "@/components/treehouse/treehouse-scene";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventory, getProfile, getRoomLayout, getShopItems, getTodayQuests } from "@/lib/data/queries";
import { levelProgress } from "@/lib/game/levels";
import { nextGoal } from "@/lib/game/next-goal";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [profile, day, layout, items, owned] = await Promise.all([
    getProfile(),
    getTodayQuests(),
    getRoomLayout(),
    getShopItems(),
    getInventory(),
  ]);
  const lp = levelProgress(profile.xp);
  const doneCount = day.quests.filter((q) => q.completedAt).length;
  const pose: PipPose = doneCount === 3 ? "cheer" : doneCount > 0 ? "happy" : "wave";
  const nextQuest = day.quests.find((q) => !q.completedAt);
  const line =
    profile.quests_completed === 0
      ? "Welcome to our treehouse! Let's earn our very first acorns together."
      : doneCount === 3
        ? "We did it! Everything today is a bonus. Maybe decorate a little?"
        : (nextQuest?.pipLine ?? "One tiny step at a time!");
  const goal = nextGoal(items, owned, profile.level, profile.acorns);
  const name = profile.display_name ?? "friend";

  return (
    <div className="flex flex-col gap-5">
      {/* Pip + level */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#CDE7DD] via-sage to-honey/60 p-0 dark:from-secondary dark:via-[#1f3530] dark:to-accent/50">
        <div className="flex items-end gap-2 p-4 pb-0 sm:gap-4 sm:p-6 sm:pb-0">
          <Pip pose={pose} size={150} interactive priority />
          <div className="mb-6 min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-forest-deep sm:text-3xl dark:text-sage">
              <Greeting name={name} timezone={profile.timezone} />
            </h1>
            <p className="mt-2 rounded-2xl rounded-bl-sm bg-card/90 p-3 text-sm font-semibold shadow-soft sm:text-base">{line}</p>
          </div>
        </div>
        <div className="bg-card/70 p-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Level {lp.level}</span>
            <span className="text-muted-foreground">
              {lp.xpIntoLevel} / {lp.xpForNext} XP
            </span>
          </div>
          <Progress value={lp.percent} className="mt-2" aria-label={`Level progress: ${lp.percent}%`} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {lp.xpRemaining} XP until Pip reaches level {lp.level + 1}
          </p>
        </div>
      </Card>

      {/* Today's quests */}
      <section aria-labelledby="today-h">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="today-h" className="text-2xl font-bold">
              Today&apos;s quests <span className="text-muted-foreground">· {doneCount}/3</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              <NewQuestsCountdown timezone={profile.timezone} />
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/quests">
              Details <ArrowRight />
            </Link>
          </Button>
        </div>
        <QuestList day={day} level={profile.level} timezone={profile.timezone} compact />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Treehouse teaser */}
        <Link href="/treehouse" className="group block rounded-3xl">
          <Card className="overflow-hidden p-3 transition group-hover:shadow-lift">
            <TreehouseScene layout={layout} level={profile.level} interactivePip={false} className="rounded-2xl shadow-none" />
            <div className="flex items-center justify-between px-1 pt-3">
              <div>
                <p className="font-display text-lg font-bold">Pip&apos;s treehouse</p>
                <p className="text-sm text-muted-foreground">Tap to decorate</p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        <div className="flex flex-col gap-5">
          {/* Next goal */}
          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-extrabold tracking-wide text-primary uppercase">
              <Sparkles className="size-4" /> Next goal
            </p>
            {goal.kind === "complete" ? (
              <p className="mt-2 font-display text-lg font-bold">You own every decoration. Legendary! 🏆</p>
            ) : (
              <div className="mt-3 flex items-center gap-4">
                <div className="size-20 shrink-0 rounded-2xl bg-muted p-2">
                  <ItemPreview itemId={goal.item.id} slot={goal.item.slot} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold">{goal.item.name}</p>
                  {goal.kind === "item" ? (
                    <>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <AcornIcon className="size-4" /> {goal.item.price}
                        {goal.affordable ? " · you can afford it!" : ` · ${goal.acornsNeeded} more to go`}
                      </p>
                      <Progress
                        value={Math.min(100, (profile.acorns / Math.max(goal.item.price, 1)) * 100)}
                        className="mt-2 h-2.5"
                        aria-label="Acorns saved toward this item"
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unlocks at level {goal.level}</p>
                  )}
                </div>
              </div>
            )}
            {goal.kind === "item" && goal.affordable && (
              <Button asChild className="mt-4 w-full" variant="honey">
                <Link href="/shop">Visit the shop</Link>
              </Button>
            )}
          </Card>

          {/* Only totals and bests: none of these can go down after a missed day. */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Tiny wins" value={profile.quests_completed} emoji="🌱" />
            <Stat label="Cozy days" value={profile.days_active} emoji="☀️" />
            <Stat label="Best rhythm" value={profile.best_streak} emoji="🎶" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-soft">
      <div className="text-xl" aria-hidden>
        {emoji}
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-64 rounded-3xl" />
      <Skeleton className="h-8 w-48" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 rounded-3xl" />
      ))}
    </div>
  );
}
