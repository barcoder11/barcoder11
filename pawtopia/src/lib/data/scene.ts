import "server-only";
import { getHabitat, listDecor } from "@/lib/data/catalog";
import { getSanctuary } from "@/lib/data/player";
import { SCENE_STYLE } from "@/components/game/Stage";
import type { Decor } from "@/lib/types";

/** Everything needed to render the player's sanctuary scene. */
export async function getSceneData() {
  const [sanctuary, decor] = await Promise.all([getSanctuary(), listDecor()]);
  const habitatSlug = sanctuary?.habitatSlug ?? "forest-glade";
  const habitat = sanctuary?.habitat ?? (await getHabitat(habitatSlug));
  const decorBySlug: Record<string, Decor> = {};
  for (const d of [...decor, ...(sanctuary?.inventory ?? [])]) decorBySlug[d.slug] = d;
  return {
    name: sanctuary?.name ?? "My Sanctuary",
    habitat,
    style: SCENE_STYLE[habitatSlug] ?? habitat?.scene_style ?? "forest",
    slots: habitat?.slots ?? [],
    placements: sanctuary?.placements ?? [],
    inventory: sanctuary?.inventory ?? [],
    decor,
    decorBySlug,
  };
}
