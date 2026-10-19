import Link from "next/link";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { adminInput } from "@/components/admin/fields";
import { Card } from "@/components/ui";
import { deleteAsset, setAssetActive, updateAssetText } from "../actions";
import { createClient } from "@/lib/supabase/server";
import type { AnimalAsset } from "@/lib/types";
import { many } from "@/lib/data/db";

type AssetRow = AnimalAsset & { animals: { id: string; name: string; slug: string } | null };

export default async function AdminAssets() {
  const supabase = await createClient();
  const data = many<AssetRow>(
    await supabase
      .from("animal_assets")
      .select("*, animals(id, name, slug)")
      .order("created_at", { ascending: false })
      .limit(200),
    "admin assets",
  );
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-bold">Asset library</h1>
      <p className="text-sm text-ink-soft">
        Upload new art from each animal&apos;s page. Allowed: PNG, WebP, JPEG, GIF (≤10 MB) and MP4/WebM (≤50 MB). SVG
        is blocked for safety.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((a) => (
          <li key={a.id}>
            <Card className={`grid gap-2 p-3 ${a.is_active ? "" : "opacity-70"}`}>
              <div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-sage">
                {a.media_kind === "video" ? (
                  <video src={a.public_url} muted loop autoPlay playsInline className="h-full w-full object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.public_url} alt={a.alt_text} className="h-full w-full object-contain" />
                )}
              </div>
              <p className="text-sm">
                <Link href={`/admin/animals/${a.animals?.id}`} className="font-bold text-forest hover:underline">
                  {a.animals?.name}
                </Link>{" "}
                · {a.state} · {a.is_active ? "live" : "inactive"}
              </p>
              <ActionForm action={updateAssetText.bind(null, a.id)} submitLabel="Save text" submitVariant="light">
                <input name="alt" defaultValue={a.alt_text} className={adminInput} aria-label="Alt text" />
                <input
                  name="credits"
                  defaultValue={a.credits ?? ""}
                  className={adminInput}
                  aria-label="Credits"
                  placeholder="Credits"
                />
              </ActionForm>
              <div className="flex gap-2">
                <ActionButton
                  action={setAssetActive.bind(null, a.id, !a.is_active)}
                  label={a.is_active ? "Deactivate" : "Make live"}
                />
                <ActionButton
                  action={deleteAsset.bind(null, a.id)}
                  label="Delete"
                  variant="danger"
                  confirm="Delete this file?"
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {data.length === 0 && (
        <p className="text-ink-soft">No uploads yet — every animal currently uses placeholder art.</p>
      )}
    </div>
  );
}
