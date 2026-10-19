import type { Metadata } from "next";
import { Suspense } from "react";
import { NewQuestsCountdown } from "@/components/app/countdown";
import { PageHeader } from "@/components/app/page-header";
import { QuestList } from "@/components/app/quest-list";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile, getTodayQuests } from "@/lib/data/queries";
import { GOAL_INFO } from "@/lib/game/constants";

export const metadata: Metadata = { title: "Daily quests" };

export default function QuestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-12 w-56" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      }
    >
      <QuestsContent />
    </Suspense>
  );
}

async function QuestsContent() {
  const [profile, day] = await Promise.all([getProfile(), getTodayQuests()]);
  const date = new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div>
      <PageHeader
        title="Daily quests"
        subtitle={
          <>
            {date} · <NewQuestsCountdown timezone={profile.timezone} />
          </>
        }
      />
      <QuestList day={day} level={profile.level} timezone={profile.timezone} allowSwap />
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {day.swapAvailable ? "Not feeling one? You can swap one unfinished quest per day." : "You've used today's swap."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-bold">How quests work</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>🌰 Each quest earns XP and acorns the moment you check it off.</li>
            <li>🌙 Three new quests arrive at midnight in your timezone ({profile.timezone.replaceAll("_", " ")}).</li>
            <li>💛 Missed a day? Nothing is lost. Pip is just happy to see you.</li>
            <li>✅ Honor system: only check off what you really did. It&apos;s your growth!</li>
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-bold">Your focus</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.goals.map((g) => (
              <span
                key={g}
                className="rounded-full px-3 py-1.5 text-sm font-bold"
                style={{ background: `${GOAL_INFO[g].color}26`, color: GOAL_INFO[g].color }}
              >
                {GOAL_INFO[g].emoji} {GOAL_INFO[g].label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Two quests follow your goals and one is a little surprise. Change goals anytime in Settings.
          </p>
        </Card>
      </div>
    </div>
  );
}
