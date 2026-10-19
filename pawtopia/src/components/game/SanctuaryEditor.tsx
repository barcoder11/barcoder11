"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimalArt } from "@/components/art/AnimalArt";
import { DecorArt } from "@/components/art/DecorArt";
import { placeDecor, removeDecor, renameSanctuary } from "@/app/app/actions";
import { Button, buttonClass, Notice } from "@/components/ui";
import { OFFLINE_MESSAGE, tryAction } from "@/lib/safe-action";
import { Stage, slotStyle } from "./Stage";
import type { Animal, AnimalAsset, AssetState, Decor, HabitatSlot, Placement } from "@/lib/types";

type Resident = { id: string; name: string; animal: Pick<Animal, "name" | "species" | "placeholder_style" | "colors">; assets: Partial<Record<AssetState, AnimalAsset>> };

const CATEGORY_LABEL: Record<HabitatSlot["category"], string> = { small: "Small spot", large: "Big spot", hanging: "Hanging spot" };
const RESIDENT_POS = [
  { left: "50%", width: "34%" },
  { left: "30%", width: "26%" },
  { left: "70%", width: "26%" },
];

export function SanctuaryEditor(props: {
  name: string;
  sceneStyle: string;
  slots: HabitatSlot[];
  placements: Placement[];
  inventory: Decor[];
  decorBySlug: Record<string, Decor>;
  residents: Resident[];
}) {
  const [placements, setPlacements] = useState(props.placements);
  const [editing, setEditing] = useState(false);
  const [activeSlot, setActiveSlot] = useState<HabitatSlot | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(props.name);
  const [renaming, setRenaming] = useState(false);

  const placedIn = (slug: string) => placements.find((p) => p.decor_slug === slug)?.slot_id;
  const inSlot = (slotId: string) => placements.find((p) => p.slot_id === slotId)?.decor_slug;

  async function choose(slot: HabitatSlot, slug: string | null) {
    setPending(true);
    const res = await tryAction(() => (slug ? placeDecor(slot.id, slug) : removeDecor(slot.id)));
    setPending(false);
    if (!res) {
      setMessage({ tone: "error", text: OFFLINE_MESSAGE });
    } else if (res.placements) {
      setPlacements(res.placements);
      setMessage({ tone: "success", text: slug ? `Placed ${props.decorBySlug[slug]?.name ?? "item"} — saved!` : "Removed — saved!" });
      setActiveSlot(null);
    } else {
      setMessage({ tone: "error", text: res.status === "wrong_slot" ? "That item doesn't fit in this spot." : "Couldn't save that change. Try again." });
    }
  }

  const options = activeSlot ? props.inventory.filter((d) => d.slot_category === activeSlot.category) : [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {renaming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await tryAction(() => renameSanctuary(name));
              if (!res) setMessage({ tone: "error", text: OFFLINE_MESSAGE });
              else if (res.status === "ok") setRenaming(false);
              else setMessage({ tone: "error", text: "Sanctuary names can be 1–40 characters." });
            }}
          >
            <label htmlFor="sanctuary-name" className="sr-only">Sanctuary name</label>
            <input id="sanctuary-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="rounded-xl border-2 border-sage-200 px-3 py-2 font-display text-xl" autoFocus />
            <Button size="sm" type="submit">Save</Button>
          </form>
        ) : (
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
            {name}
            <button type="button" onClick={() => setRenaming(true)} className="text-base opacity-60 hover:opacity-100" aria-label="Rename sanctuary">✏️</button>
          </h1>
        )}
        <Button variant={editing ? "honey" : "primary"} size="sm" onClick={() => { setEditing(!editing); setActiveSlot(null); }} data-testid="toggle-decorate">
          {editing ? "✓ Done decorating" : "🎨 Decorate"}
        </Button>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Stage
        sceneStyle={props.sceneStyle}
        slots={props.slots}
        placements={placements}
        decorBySlug={props.decorBySlug}
        className="aspect-[4/5] rounded-[2.25rem] shadow-2xl ring-4 ring-white sm:aspect-[16/10]"
        overlay={
          editing &&
          props.slots.map((slot) => {
            const occupied = inSlot(slot.id);
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveSlot(slot)}
                className={`absolute grid place-items-center rounded-2xl border-[3px] border-dashed text-xs font-extrabold transition ${
                  activeSlot?.id === slot.id ? "border-honey bg-honey/40" : occupied ? "border-white/80 bg-white/10" : "border-white bg-white/40 hover:bg-white/60"
                }`}
                style={{ ...slotStyle(slot), zIndex: 60, aspectRatio: "1 / 1" }}
                aria-label={`${slot.label} (${CATEGORY_LABEL[slot.category]})${occupied ? `, has ${props.decorBySlug[occupied]?.name}` : ", empty"}`}
                data-testid={`slot-${slot.id}`}
              >
                {!occupied && <span className="rounded-full bg-white px-2 py-0.5 text-forest shadow">＋</span>}
              </button>
            );
          })
        }
      >
        {props.residents.slice(0, 3).map((r, i) => (
          <Link
            key={r.id}
            href={`/app/animals/${r.id}`}
            className="absolute bottom-[6%] z-[25] -translate-x-1/2"
            style={{ left: RESIDENT_POS[i].left, width: RESIDENT_POS[i].width, aspectRatio: "1 / 1" }}
            aria-label={`Visit ${r.name}`}
          >
            <AnimalArt animal={r.animal} assets={r.assets} />
          </Link>
        ))}
      </Stage>

      {props.residents.length === 0 && (
        <Notice>Your sanctuary is waiting for its first resident. <Link href="/app" className="underline">Adopt an animal</Link> to bring it to life.</Notice>
      )}

      {/* Slot picker (bottom sheet) */}
      {editing && activeSlot && (
        <div className="slide-up rounded-[1.75rem] bg-white p-4 shadow-soft ring-1 ring-ink/5" role="region" aria-label={`Choose an item for ${activeSlot.label}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-terracotta">{CATEGORY_LABEL[activeSlot.category]}</p>
              <h2 className="font-display text-xl font-bold">{activeSlot.label}</h2>
            </div>
            <button type="button" className="rounded-full px-3 py-1 font-bold text-ink-soft hover:bg-sage" onClick={() => setActiveSlot(null)}>
              Close
            </button>
          </div>
          {options.length === 0 ? (
            <p className="text-ink-soft">
              You don&apos;t own anything for this spot yet. <Link href="/app/shop" className="font-bold text-forest underline">Visit the shop</Link>
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {options.map((d) => {
                const where = placedIn(d.slug);
                const here = where === activeSlot.id;
                return (
                  <li key={d.slug}>
                    <button
                      type="button"
                      disabled={pending || here}
                      onClick={() => choose(activeSlot, d.slug)}
                      className={`flex w-full flex-col items-center gap-1 rounded-2xl p-2 text-center text-xs font-bold ring-2 transition ${here ? "bg-sage ring-forest" : "ring-sage-200 hover:bg-cream-200"}`}
                      data-testid={`choose-${d.slug}`}
                    >
                      <DecorArt artKey={d.art_key} title={d.name} className="h-14 w-14" />
                      {d.name}
                      {where && !here && <span className="font-semibold text-ink-soft">(moves here)</span>}
                      {here && <span className="text-forest">Placed</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {inSlot(activeSlot.id) && (
            <Button variant="light" size="sm" className="mt-3" disabled={pending} onClick={() => choose(activeSlot, null)}>
              Remove item from this spot
            </Button>
          )}
        </div>
      )}

      {/* Accessible list alternative to tapping the scene */}
      <details className="rounded-[1.5rem] bg-white p-4 ring-1 ring-ink/5">
        <summary className="cursor-pointer font-display text-lg font-semibold">All decoration spots ({placements.length}/{props.slots.length} filled)</summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {props.slots.map((slot) => {
            const occupied = inSlot(slot.id);
            return (
              <li key={slot.id} className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
                <span>
                  <strong>{slot.label}</strong> · {occupied ? props.decorBySlug[occupied]?.name : <em className="text-ink-soft">empty</em>}
                </span>
                <button type="button" className="font-bold text-forest hover:underline" onClick={() => { setEditing(true); setActiveSlot(slot); }}>
                  Change
                </button>
              </li>
            );
          })}
        </ul>
      </details>

      <div className="flex gap-2">
        <Link href="/app/shop" className={buttonClass("honey", "md")}>🛍️ Get more decorations</Link>
      </div>
    </div>
  );
}
