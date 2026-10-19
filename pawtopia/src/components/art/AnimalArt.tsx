import Image from "next/image";
import type { Animal, AnimalAsset, AssetState } from "@/lib/types";
import { Critter, StateEffects, type PetState } from "./Critter";

type AssetMap = Partial<Record<AssetState, AnimalAsset>>;

/** Picks the uploaded asset for a state (falling back to idle/avatar), else undefined (placeholder art). */
function pickAsset(assets: AssetMap, state: PetState): AnimalAsset | undefined {
  return assets[state as AssetState] ?? assets.idle ?? assets.avatar;
}

/**
 * Renders a character in an animation state. Official uploaded art is used when
 * available: the wrapper carries the `pet pet-<state>` classes that drive the
 * CSS motion (see globals.css `.pet-asset`), and when the state has no
 * dedicated artwork the reaction effects are layered on top so every action
 * still reads clearly. Without uploads, the labelled placeholder SVG is shown.
 */
export function AnimalArt({
  animal,
  assets,
  state = "idle",
  className = "",
  priority = false,
}: {
  animal: Pick<Animal, "name" | "species" | "placeholder_style" | "colors">;
  assets: AssetMap;
  state?: PetState;
  className?: string;
  priority?: boolean;
}) {
  const asset = pickAsset(assets, state);
  if (!asset) {
    const stateLabel = state === "idle" ? "" : ` (${state})`;
    return (
      <Critter
        variant={animal.placeholder_style}
        colors={animal.colors}
        state={state}
        title={`${animal.name} the ${animal.species.toLowerCase()}${stateLabel} — placeholder illustration`}
        className={`h-full w-full drop-shadow-lg ${className}`}
      />
    );
  }

  const hasStateArt = Boolean(assets[state as AssetState]);
  return (
    <div className={`pet pet-${state} relative h-full w-full ${className}`} data-art="uploaded">
      {asset.media_kind === "video" ? (
        <video
          key={asset.id}
          className="pet-asset h-full w-full object-contain"
          src={asset.public_url}
          autoPlay
          muted
          loop
          playsInline
          aria-label={asset.alt_text}
        />
      ) : (
        // Resized and re-encoded per device by Next's image optimizer.
        <Image
          key={asset.id}
          src={asset.public_url}
          alt={asset.alt_text}
          fill
          sizes="(min-width: 1024px) 480px, 80vw"
          className="pet-asset object-contain drop-shadow-xl"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      )}
      {!hasStateArt && state !== "idle" && (
        <svg
          viewBox="0 0 200 200"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          data-testid="pet-effects"
        >
          <StateEffects state={state} />
        </svg>
      )}
    </div>
  );
}

/** Small label shown wherever placeholder art stands in for official artwork. */
export function PlaceholderBadge({ assets, className = "" }: { assets: AssetMap; className?: string }) {
  if (assets.idle || assets.avatar) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft ring-1 ring-ink/10 backdrop-blur ${className}`}
      title="Official character artwork will replace this placeholder"
    >
      ✏️ Placeholder art
    </span>
  );
}
