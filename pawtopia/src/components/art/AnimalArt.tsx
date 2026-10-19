import type { Animal, AnimalAsset, AssetState } from "@/lib/types";
import { Critter, type PetState } from "./Critter";

type AssetMap = Partial<Record<AssetState, AnimalAsset>>;

/** Picks the uploaded asset for a state (falling back to idle/avatar), else placeholder SVG art. */
export function pickAsset(assets: AssetMap, state: PetState): AnimalAsset | undefined {
  return assets[state as AssetState] ?? assets.idle ?? assets.avatar;
}

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
  const stateLabel = state === "idle" ? "" : ` (${state})`;
  if (asset?.media_kind === "video") {
    return (
      <video
        key={asset.id}
        className={`pet pet-${state} h-full w-full object-contain ${className}`}
        src={asset.public_url}
        autoPlay
        muted
        loop
        playsInline
        aria-label={asset.alt_text}
      />
    );
  }
  if (asset) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={asset.id}
        src={asset.public_url}
        alt={asset.alt_text}
        className={`pet pet-${state} pet-body-group h-full w-full object-contain drop-shadow-xl ${className}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }
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
