import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { AcornIcon, XpIcon } from "@/components/brand/icons";
import { Pip } from "@/components/pip/pip";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getAchievements, getProfile, getQuestHistory, getRecentRewards, type RewardEvent } from "@/lib/data/queries";
import { GOAL_INFO } from "@/lib/game/constants";
import { levelProgress } from "@/lib/game/levels";
import { GOALS } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress & achievements" };

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      }
    >
      <ProgressContent />
    </Suspense>
  );
}

async function ProgressContent() {
  const [profile, achievements, history, rewards] = await Promise.all([
    getProfile(),
    getAchievements(),
    getQuestHistory(7),
    getRecentRewards(12),
  ]);
  const lp = levelProgress(profile.xp);
  const unlocked = achievements.filter((a) => a.unlockedAt).length;
  const maxDay = Math.max(3, ...history.byDay.map((d) => d.completed));
  const maxCat = Math.max(1, ...Object.values(history.byCategory));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Progress" subtitle="Every tiny win, all in one place." />

      <Card className="flex items-center gap-4 overflow-hidden bg-gradient-to-r from-sage to-honey/50 p-5 dark:from-secondary dark:to-accent/40">
        <Pip pose="happy" size={110} />
        <div className="flex-1">
          <p className="font-display text-3xl font-bold">Level {lp.level}</p>
          <p className="text-sm text-muted-foreground">{profile.xp.toLocaleString()} XP total</p>
          <Progress value={lp.percent} className="mt-2" aria-label={`Level progress: ${lp.percent}%`} />
          <p className="mt-1 text-xs text-muted-foreground">{lp.xpRemaining} XP to level {lp.level + 1}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Quests done" value={profile.quests_completed} icon="✅" />
        <StatCard label="Cozy days" value={profile.days_active} icon="☀️" />
        <StatCard label="Best rhythm" value={profile.best_streak} icon="🎶" suffix={profile.best_streak === 1 ? " day" : " days"} />
        <StatCard label="Achievements" value={unlocked} icon="🏆" suffix={` / ${achievements.length}`} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-bold">This week</h2>
          <div className="mt-4 flex h-40 items-end gap-2" role="img" aria-label={`Quests completed over the last 7 days: ${history.byDay.map((d) => d.completed).join(", ")}`}>
            {history.byDay.map((d) => {
              const date = new Date(`${d.date}T12:00:00Z`);
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">{d.completed || ""}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn("w-full rounded-xl transition-all", d.completed ? "bg-gradient-to-t from-forest to-hoodie" : "bg-muted")}
                      style={{ height: `${Math.max(8, (d.completed / maxDay) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {date.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Empty days are fine. Rest is part of growing.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">Your wins by goal</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {GOALS.map((g) => {
              const n = history.byCategory[g] ?? 0;
              return (
                <li key={g}>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>
                      {GOAL_INFO[g].emoji} {GOAL_INFO[g].label}
                    </span>
                    <span className="text-muted-foreground">{n}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(n / maxCat) * 100}%`, background: GOAL_INFO[g].color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="ach-h">
        <h2 id="ach-h" className="mb-3 text-2xl font-bold">
          Achievements <span className="text-muted-foreground">· {unlocked}/{achievements.length}</span>
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex flex-col items-center rounded-3xl border-2 p-4 text-center",
                a.unlockedAt ? "border-honey-deep/50 bg-honey/30 shadow-soft dark:bg-accent/30" : "border-dashed border-border bg-card/50",
              )}
            >
              <span className={cn("text-4xl", !a.unlockedAt && "opacity-40 grayscale")} aria-hidden>
                {a.icon}
              </span>
              <span className="mt-2 font-display font-bold">{a.title}</span>
              <span className="text-xs text-muted-foreground">{a.description}</span>
              <span className="mt-2 text-xs font-bold">
                {a.unlockedAt ? (
                  <span className="text-forest dark:text-sage">Unlocked {new Date(a.unlockedAt).toLocaleDateString("en-US", { timeZone: profile.timezone, month: "short", day: "numeric" })}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <AcornIcon className="size-3.5" /> +{a.acorn_reward}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Card className="p-5">
        <h2 className="text-xl font-bold">Recent rewards</h2>
        {rewards.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Complete your first quest to start your reward history.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {rewards.map((r) => (
              <RewardRow key={r.id} r={r} timezone={profile.timezone} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RewardRow({ r, timezone }: { r: RewardEvent; timezone: string }) {
  const label =
    r.kind === "quest" ? "Quest completed" : r.kind === "level_up" ? `Reached level ${r.ref}` : r.kind === "achievement" ? "Achievement bonus" : "Bought a decoration";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span>
        <span className="font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-US", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" })}</span>
      </span>
      <span className="flex items-center gap-3 font-bold">
        {r.xp_delta !== 0 && (
          <span className="inline-flex items-center gap-1">
            <XpIcon className="size-4" /> +{r.xp_delta}
          </span>
        )}
        {r.acorn_delta !== 0 && (
          <span className={cn("inline-flex items-center gap-1", r.acorn_delta < 0 && "text-muted-foreground")}>
            <AcornIcon className="size-4" /> {r.acorn_delta > 0 ? "+" : ""}
            {r.acorn_delta}
          </span>
        )}
      </span>
    </li>
  );
}

function StatCard({ label, value, icon, suffix = "" }: { label: string; value: number; icon: string; suffix?: string }) {
  return (
    <Card className="p-4">
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-1 font-display text-2xl font-bold">
        {value.toLocaleString()}
        <span className="text-base text-muted-foreground">{suffix}</span>
      </p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}
