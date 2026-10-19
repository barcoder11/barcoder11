import { AcornIcon, XpIcon } from "@/components/brand/icons";
import { Pip } from "@/components/pip/pip";

const QUESTS = [
  { icon: "📚", title: "Study for 10 minutes", meta: "Studying · 10 min", done: true },
  { icon: "🧾", title: "Track one expense", meta: "Saving money · 2 min", done: false },
  { icon: "🚶", title: "Walk for 5 minutes", meta: "Fitness · 5 min", done: false },
];

/** Static phone mockup of the app home screen for the hero. */
export function AppPreview() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[310px]" aria-label="Preview of the Tiny Wins app" role="img">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-honey/70 via-sage to-forest/40 blur-2xl dark:opacity-40" />
      <div className="overflow-hidden rounded-[2.6rem] border-[10px] border-[#2F2A24] bg-background shadow-lift">
        <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-[#2F2A24]" />
        <div className="px-4 pt-3 pb-5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 shadow-soft">
              <XpIcon className="size-3.5" /> Lv 4
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 shadow-soft">
              <AcornIcon className="size-3.5" /> 128
            </span>
          </div>
          <div className="mt-3 flex items-end gap-2 rounded-3xl bg-gradient-to-b from-[#BFE3DC] to-[#F7EAD2] p-3 dark:from-[#24403a] dark:to-[#3c3550]">
            <Pip pose="wave" size={96} priority />
            <div className="mb-3 rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-xs font-semibold shadow-soft">
              Good morning! Three tiny wins today?
            </div>
          </div>
          <p className="mt-4 mb-2 font-display text-sm font-bold">Today&apos;s quests · 1/3</p>
          <div className="flex flex-col gap-2">
            {QUESTS.map((q) => (
              <div key={q.title} className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-2.5 shadow-soft">
                <span className="grid size-9 place-items-center rounded-xl bg-sage/70 text-lg dark:bg-secondary">{q.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13px] font-bold ${q.done ? "text-muted-foreground line-through" : ""}`}>{q.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{q.meta}</span>
                </span>
                <span className={`grid size-7 place-items-center rounded-lg border-2 text-xs ${q.done ? "border-forest bg-forest text-white" : "border-forest/30"}`}>
                  {q.done ? "✓" : ""}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-card p-1.5 text-center text-[10px] font-bold text-muted-foreground shadow-soft">
            <span className="rounded-xl bg-sage/70 py-1.5 text-forest-deep dark:bg-secondary dark:text-sage">🏠<br />Home</span>
            <span className="py-1.5">✅<br />Quests</span>
            <span className="py-1.5">🌳<br />House</span>
            <span className="py-1.5">🛍️<br />Shop</span>
          </div>
        </div>
      </div>
    </div>
  );
}
