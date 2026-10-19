"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimalArt, PlaceholderBadge } from "@/components/art/AnimalArt";
import type { PetState } from "@/components/art/Critter";
import { performCare, renameAdoption } from "@/app/app/actions";
import { Modal as Dialog } from "@/components/Modal";
import { buttonClass } from "@/components/ui";
import { useGameState } from "./GameState";
import { Stage } from "./Stage";
import { CARE_ACTIONS, levelProgress, phaseLabel, reactionText } from "@/lib/game";
import { OFFLINE_MESSAGE, tryAction } from "@/lib/safe-action";
import type {
  Animal, AnimalAsset, AssetState, CareAction, CareResult, ChapterOutline, Decor, Economy, HabitatSlot, Placement, RecoveryPhase,
} from "@/lib/types";

const STATE_FOR: Record<CareAction, PetState> = { comfort: "comforted", snack: "snacking", play: "playing", rest: "resting" };
const TUTORIAL: CareAction[] = ["comfort", "snack", "play"];
const TUTORIAL_TIPS: Record<CareAction, string> = {
  comfort: "is still a little nervous. Start with a gentle comfort.",
  snack: "is feeling braver! Offer a tasty snack.",
  play: "trusts you a little more. Time to play!",
  rest: "",
};

type Toast = { id: number; text: string; tone: "xp" | "acorn" | "info" };
type Modal = { kind: "chapter"; chapter: { ordinal: number; title: string; phase: RecoveryPhase } } | { kind: "gift"; name: string } | null;

export function CareRoom(props: {
  adoption: { id: string; nickname: string | null; bond_xp: number; level: number; phase: RecoveryPhase; care_count: number };
  animal: Pick<Animal, "name" | "species" | "placeholder_style" | "colors">;
  assets: Partial<Record<AssetState, AnimalAsset>>;
  economy: Economy;
  lastTimes: Partial<Record<CareAction, string>>;
  serverNow: number;
  scene: { style: string; slots: HabitatSlot[]; placements: Placement[]; decorBySlug: Record<string, Decor> };
  outline: ChapterOutline[];
  welcome: boolean;
  shareUrl: string;
  acornActivitiesToday: CareAction[];
}) {
  const { adoption, animal, assets, economy, outline, scene } = props;
  const { setBalance } = useGameState();
  const [nickname, setNickname] = useState(adoption.nickname);
  const displayName = nickname || animal.name;
  const [pet, setPet] = useState<PetState>("idle");
  const [xp, setXp] = useState(adoption.bond_xp);
  const [phase, setPhase] = useState(adoption.phase);
  const [lastTimes, setLastTimes] = useState(props.lastTimes);
  const [busy, setBusy] = useState<CareAction | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reaction, setReaction] = useState(`${displayName} looks up at you with bright, curious eyes.`);
  const [modal, setModal] = useState<Modal>(null);
  const [done, setDone] = useState<Set<CareAction>>(new Set());
  const [acornToday, setAcornToday] = useState<Set<CareAction>>(() => new Set(props.acornActivitiesToday));
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(adoption.care_count === 0);
  const [now, setNow] = useState(() => props.serverNow);
  const offset = useRef(0);
  const petTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastId = useRef(0);
  const pendingModals = useRef<Modal[]>([]);

  useEffect(() => {
    offset.current = props.serverNow - Date.now();
    setNow(Date.now() + offset.current);
  }, [props.serverNow]);

  // Tick only while at least one cooldown is running (avoids needless re-renders).
  const coolingDown = CARE_ACTIONS.some(({ id }) => {
    const last = lastTimes[id];
    return last ? new Date(last).getTime() + economy.actions[id].cooldown_seconds * 1000 > now : false;
  });
  useEffect(() => {
    if (!coolingDown) return;
    const t = setInterval(() => setNow(Date.now() + offset.current), 500);
    return () => clearInterval(t);
  }, [coolingDown]);

  const progress = levelProgress(xp, economy.level_thresholds);
  const nextChapter = useMemo(() => outline.find((c) => c.unlock_bond_xp > xp), [outline, xp]);
  const tutorialNext = TUTORIAL.find((a) => !done.has(a));

  function cooldownLeft(action: CareAction) {
    const last = lastTimes[action];
    if (!last) return 0;
    const end = new Date(last).getTime() + economy.actions[action].cooldown_seconds * 1000;
    return Math.max(0, Math.ceil((end - now) / 1000));
  }

  function pushToast(text: string, tone: Toast["tone"]) {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1900);
  }

  function showNextModal() {
    setModal(pendingModals.current.shift() ?? null);
  }

  async function act(action: CareAction) {
    if (busy || cooldownLeft(action) > 0) return;
    setBusy(action);
    // Animate immediately; the server decides the rewards.
    clearTimeout(petTimer.current);
    setPet(STATE_FOR[action]);
    const key = crypto.randomUUID();
    // On a network hiccup, retry once with the same key (idempotent: never double-rewards).
    const result: CareResult =
      (await tryAction(() => performCare(props.adoption.id, action, key))) ??
      (await tryAction(() => performCare(props.adoption.id, action, key))) ?? { status: "error" };
    setBusy(null);

    if (result.status === "ok" || result.status === "replay") {
      setLastTimes((l) => ({ ...l, [action]: new Date(Date.now() + offset.current).toISOString() }));
      if (typeof result.bond_xp === "number") setXp(result.bond_xp);
      if (result.phase) setPhase(result.phase);
      if (typeof result.balance === "number") setBalance(result.balance);
      setReaction(reactionText(action, displayName, toastId.current + xp));
      if (result.status === "ok") {
        if (result.xp_awarded) pushToast(`+${result.xp_awarded} bond`, "xp");
        if (result.acorns_awarded) {
          setTimeout(() => pushToast(`+${result.acorns_awarded} acorns`, "acorn"), 250);
          setAcornToday((s) => new Set(s).add(action));
        }
        if (!result.xp_awarded && !result.acorns_awarded) {
          pushToast(`${displayName} loved that!`, "info");
          setReaction((r) => `${r} (Today's bond rewards are complete — come back tomorrow for more.)`);
        }
      }
      setDone((prev) => {
        const nextDone = new Set(prev).add(action);
        if (TUTORIAL.every((a) => nextDone.has(a))) setShowTutorial(false);
        return nextDone;
      });
      // Queue (never replace) popups, so a quick second tap can't swallow an unlock or gift.
      pendingModals.current.push(
        ...(result.unlocked_chapters ?? []).map((c) => ({ kind: "chapter" as const, chapter: c })),
        ...(result.gift ? [{ kind: "gift" as const, name: result.gift.name }] : []),
      );
      petTimer.current = setTimeout(
        () => {
          setPet("idle");
          showNextModal();
        },
        action === "rest" ? 4200 : 2600,
      );
    } else {
      setPet("idle");
      if (result.status === "cooldown") {
        setReaction(`${displayName} is still enjoying that. Try something else for a moment!`);
        if (result.retry_after_seconds) {
          const lastIso = new Date(
            Date.now() + offset.current - (economy.actions[action].cooldown_seconds - result.retry_after_seconds) * 1000,
          ).toISOString();
          setLastTimes((l) => ({ ...l, [action]: lastIso }));
        }
      } else {
        setReaction("Hmm, that didn't go through. Check your connection and try again.");
      }
    }
  }

  return (
    <div className="grid gap-4">
      {/* ---------------------------------------------------- scene */}
      <div className="relative">
        <Stage
          sceneStyle={scene.style}
          slots={scene.slots}
          placements={scene.placements}
          decorBySlug={scene.decorBySlug}
          className="aspect-square rounded-[2.25rem] shadow-2xl ring-4 ring-white sm:aspect-[16/11]"
          overlay={
            <>
              {/* HUD */}
              <div className="absolute inset-x-3 top-3 z-40 flex items-start justify-between gap-2">
                <div className="rounded-2xl bg-white/90 px-3 py-2 shadow backdrop-blur">
                  <NameEditor
                    id={adoption.id}
                    name={displayName}
                    canonical={animal.name}
                    onSaved={(n) => setNickname(n)}
                  />
                  <p className="text-xs font-bold text-ink-soft">
                    {phaseLabel(phase)} · Level {progress.level}
                  </p>
                </div>
                <PlaceholderBadge assets={assets} />
              </div>
              {/* toasts */}
              <div className="pointer-events-none absolute left-1/2 top-[22%] z-50 grid gap-2" aria-hidden="true">
                {toasts.map((t) => (
                  <span
                    key={t.id}
                    className={`reward-toast absolute left-1/2 whitespace-nowrap rounded-full px-4 py-1.5 font-display text-lg font-bold shadow-lg ${
                      t.tone === "acorn" ? "top-10 bg-honey text-ink" : t.tone === "xp" ? "bg-[#E8577A] text-white" : "bg-white text-forest"
                    }`}
                  >
                    {t.tone === "acorn" ? "🌰 " : t.tone === "xp" ? "💗 " : "✨ "}
                    {t.text}
                  </span>
                ))}
              </div>
            </>
          }
        >
          <button
            type="button"
            onClick={() => act("comfort")}
            className="absolute bottom-[5%] left-1/2 z-[25] h-[52%] w-[46%] -translate-x-1/2 cursor-pointer rounded-full sm:h-[60%] sm:w-[34%]"
            aria-label={`Pet ${displayName} (comfort)`}
            data-testid="pet"
            data-pet-state={pet}
          >
            <AnimalArt animal={animal} assets={assets} state={pet} priority />
          </button>
        </Stage>
      </div>

      {/* ---------------------------------------------------- action dock */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4" role="group" aria-label="Care actions">
        {CARE_ACTIONS.map((a) => {
          const left = cooldownLeft(a.id);
          const total = economy.actions[a.id].cooldown_seconds;
          const pct = left > 0 ? Math.round((left / total) * 100) : 0;
          const highlight = showTutorial && tutorialNext === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => act(a.id)}
              disabled={left > 0 || busy !== null}
              data-testid={`care-${a.id}`}
              aria-label={left > 0 ? `${a.label} — ready in ${left} seconds` : a.label}
              className={`btn-3d relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[1.5rem] bg-white font-display font-semibold text-ink ring-1 ring-ink/10 transition disabled:cursor-not-allowed sm:aspect-auto sm:h-28 ${
                highlight ? "ring-4 ring-honey" : ""
              }`}
            >
              {pct > 0 && (
                <span
                  className="absolute inset-0 rounded-[1.5rem] bg-ink/10"
                  style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
                  aria-hidden="true"
                />
              )}
              <span className={`text-3xl sm:text-4xl ${highlight ? "wobble-hover animate-bounce" : ""}`} aria-hidden="true">
                {a.emoji}
              </span>
              <span className="text-sm sm:text-base">{left > 0 ? `${left}s` : a.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- tutorial tip */}
      {showTutorial && tutorialNext && (
        <div className="slide-up flex items-center gap-3 rounded-[1.5rem] bg-forest px-4 py-3 text-cream shadow-soft" role="status">
          <span className="text-2xl" aria-hidden="true">💡</span>
          <p className="font-semibold">
            {props.welcome && done.size === 0 ? `Welcome home! ${displayName} ` : `${displayName} `}
            {TUTORIAL_TIPS[tutorialNext]}
          </p>
        </div>
      )}

      {/* ---------------------------------------------------- reaction + bond */}
      <div className="grid gap-3 rounded-[1.75rem] bg-white p-4 shadow-soft ring-1 ring-ink/5">
        <p className="min-h-12 text-base font-semibold" aria-live="polite" data-testid="reaction">
          {reaction}
        </p>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-ink-soft">
            <span>Bond · Level {progress.level}</span>
            <span data-testid="bond-xp">{xp} XP</span>
          </div>
          <div
            className="h-4 overflow-hidden rounded-full bg-sage"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
            aria-label="Progress to next bond level"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-[#E8577A] to-honey transition-all duration-700" style={{ width: `${progress.pct}%` }} />
          </div>
          {nextChapter && (
            <p className="mt-1.5 text-xs font-semibold text-ink-soft">
              📖 Next chapter “{nextChapter.title}” unlocks at {nextChapter.unlock_bond_xp} bond XP
            </p>
          )}
        </div>
        <AcornBonus limit={economy.daily_acorn_actions} earned={acornToday} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/sanctuary" className={buttonClass("light", "sm")}>🏡 Decorate</Link>
        <Link href="/app/stories" className={buttonClass("light", "sm")}>📖 Story</Link>
        <Link href="/app/shop" className={buttonClass("light", "sm")}>🛍️ Shop</Link>
        <button
          type="button"
          className={buttonClass("honey", "sm")}
          data-testid="share"
          onClick={async () => {
            const text = `I virtually adopted ${animal.name} in Pawtopia 🐾 Come meet them!`;
            try {
              if (navigator.share) {
                await navigator.share({ title: `${animal.name} · Pawtopia`, text, url: props.shareUrl });
                return;
              }
              await navigator.clipboard.writeText(`${text} ${props.shareUrl}`);
              setShareNote("Link copied — paste it anywhere!");
            } catch {
              setShareNote(null);
            }
          }}
        >
          📣 Share {animal.name}
        </button>
      </div>
      {shareNote && <p className="text-sm font-bold text-forest" role="status">{shareNote}</p>}

      {/* ---------------------------------------------------- popups (chapter unlocks, gifts) */}
      <Dialog open={modal !== null} onClose={showNextModal} labelledBy="room-dialog-title" className="text-center">
        {modal?.kind === "chapter" && (
          <>
            <div className="text-5xl" aria-hidden="true">📖</div>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-terracotta">New chapter unlocked</p>
            <h2 id="room-dialog-title" className="mt-1 font-display text-2xl font-bold">
              Chapter {modal.chapter.ordinal}: {modal.chapter.title}
            </h2>
            <p className="mt-2 text-ink-soft">{displayName} has entered a new phase: {phaseLabel(modal.chapter.phase)}.</p>
            <div className="mt-5 grid gap-2">
              <Link href={`/app/stories#chapter-${adoption.id}-${modal.chapter.ordinal}`} className={buttonClass("primary", "md")}>
                Read the chapter
              </Link>
              <button type="button" className={buttonClass("ghost", "md")} onClick={showNextModal} data-autofocus>
                Keep playing
              </button>
            </div>
          </>
        )}
        {modal?.kind === "gift" && (
          <>
            <div className="text-5xl" aria-hidden="true">🎁</div>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-terracotta">First-care gift</p>
            <h2 id="room-dialog-title" className="mt-1 font-display text-2xl font-bold">You earned a {modal.name}!</h2>
            <p className="mt-2 text-ink-soft">
              {displayName} would love it in the sanctuary. Place it now, or keep caring and decorate later.
            </p>
            <div className="mt-5 grid gap-2">
              <Link href="/app/sanctuary" className={buttonClass("primary", "md")} data-testid="gift-place">
                Place it in my sanctuary
              </Link>
              <button type="button" className={buttonClass("ghost", "md")} onClick={showNextModal} data-autofocus>
                Later
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function NameEditor({ id, name, canonical, onSaved }: { id: string; name: string; canonical: string; onSaved: (n: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name === canonical ? "" : name);
  const [error, setError] = useState<string | null>(null);
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 font-display text-xl font-bold" aria-label={`Rename ${name}`}>
        {name} <span className="text-sm opacity-60" aria-hidden="true">✏️</span>
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await tryAction(() => renameAdoption(id, value));
        if (!res) setError(OFFLINE_MESSAGE);
        else if (res.status === "ok") {
          onSaved((res as { nickname?: string | null }).nickname ?? null);
          setEditing(false);
          setError(null);
        } else setError("Nicknames can be up to 30 characters.");
      }}
    >
      <label htmlFor="nick" className="sr-only">Nickname</label>
      <input
        id="nick"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={30}
        placeholder={canonical}
        className="w-32 rounded-lg border border-sage-200 px-2 py-1 text-sm"
        autoFocus
      />
      <button type="submit" className="rounded-lg bg-forest px-2 py-1 text-xs font-bold text-cream">Save</button>
      {error && <span className="text-xs text-terracotta">{error}</span>}
    </form>
  );
}

/** Shows how many acorn-earning activities are left today (resets at the player's local midnight). */
function AcornBonus({ limit, earned }: { limit: number; earned: Set<CareAction> }) {
  if (limit <= 0) return null;
  const left = Math.max(0, limit - earned.size);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-honey/20 px-3 py-2 text-sm" data-testid="acorn-bonus">
      <span className="font-bold">🌰 Daily acorn bonus</span>
      <span className="flex items-center gap-1.5" aria-label={left > 0 ? `${left} of ${limit} acorn activities left today` : "Today's acorn bonus complete"}>
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={`h-3 w-3 rounded-full ${i < earned.size ? "bg-honey-600" : "bg-white ring-1 ring-ink/15"}`} aria-hidden="true" />
        ))}
        <span className="ml-1 text-xs font-semibold text-ink-soft">
          {left > 0 ? `${left} left — try a different activity` : "Done for today · bond still grows"}
        </span>
      </span>
    </div>
  );
}
