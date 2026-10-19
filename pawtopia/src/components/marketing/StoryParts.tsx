import { PHASES } from "@/lib/game";
import type { ChapterOutline, RescueStory } from "@/lib/types";

export function ChapterTeaser({ outline, name }: { outline: ChapterOutline[]; name: string }) {
  if (outline.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">{name}&apos;s recovery journey</h2>
      <p className="mt-1 text-sm text-ink-soft">Chapters unlock as your bond grows through care and play.</p>
      <ol className="mt-4 grid gap-2">
        {outline.map((c) => {
          const phase = PHASES.find((p) => p.id === c.phase);
          return (
            <li key={c.ordinal} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink/5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage text-lg" aria-hidden="true">
                {c.ordinal === 1 ? phase?.emoji : "🔒"}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-terracotta">
                  Chapter {c.ordinal} · {phase?.label}
                </p>
                <p className="truncate font-display text-lg font-semibold">{c.title}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function VideoLinks({ rescue }: { rescue: RescueStory }) {
  const links = [
    ["TikTok", rescue.tiktok_url],
    ["Instagram", rescue.instagram_url],
    ["Facebook", rescue.facebook_url],
    ["YouTube", rescue.youtube_url],
  ].filter(([, url]) => !!url) as [string, string][];
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-ink-soft">Watch the original video:</span>
      {links.map(([label, url]) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-forest ring-1 ring-ink/10 hover:bg-sage"
        >
          ▶ {label}
        </a>
      ))}
    </div>
  );
}
