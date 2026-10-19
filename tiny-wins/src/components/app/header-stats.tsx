import Link from "next/link";
import { AcornIcon, XpIcon } from "@/components/brand/icons";
import { getProfile } from "@/lib/data/queries";
import { levelProgress } from "@/lib/game/levels";
import { AnimatedNumber } from "./animated-number";

export async function HeaderStats() {
  const profile = await getProfile();
  const lp = levelProgress(profile.xp);
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/progress"
        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card py-1 pr-3 pl-1 text-sm font-extrabold shadow-soft"
        aria-label={`Level ${profile.level}, ${lp.xpRemaining} XP to next level`}
      >
        <span
          className="grid size-7 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--hoodie) ${lp.percent * 3.6}deg, var(--muted) 0deg)` }}
        >
          <span className="grid size-5 place-items-center rounded-full bg-card">
            <XpIcon className="size-3.5" />
          </span>
        </span>
        Lv <AnimatedNumber value={profile.level} />
      </Link>
      <Link
        href="/shop"
        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm font-extrabold shadow-soft"
        aria-label={`${profile.acorns} acorns`}
      >
        <AcornIcon className="size-4.5" />
        <AnimatedNumber value={profile.acorns} />
      </Link>
    </div>
  );
}

export function HeaderStatsSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="h-9 w-20 animate-pulse rounded-full bg-muted" />
      <span className="h-9 w-16 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
