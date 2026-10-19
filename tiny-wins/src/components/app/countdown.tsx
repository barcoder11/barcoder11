"use client";

import { useSyncExternalStore } from "react";

function secondsUntilMidnight(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return 86400 - (get("hour") * 3600 + get("minute") * 60 + get("second"));
  } catch {
    return 0;
  }
}

function format(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}

const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
};

/** "New quests in 5h 12m", based on the user's saved timezone. */
export function NewQuestsCountdown({ timezone, prefix = "New quests in" }: { timezone: string; prefix?: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => format(secondsUntilMidnight(timezone)),
    () => "",
  );
  if (!label) return null;
  return (
    <span>
      {prefix} {label}
    </span>
  );
}
