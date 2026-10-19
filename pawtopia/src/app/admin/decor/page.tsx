import { ActionForm } from "@/components/admin/ActionForm";
import { Field, adminInput } from "@/components/admin/fields";
import { DecorArt } from "@/components/art/DecorArt";
import { Card } from "@/components/ui";
import { saveDecor } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { many } from "@/lib/data/db";
import { createClient } from "@/lib/supabase/server";
import type { Decor } from "@/lib/types";

const ART_KEYS = ["blanket", "bowl", "flowers", "ball", "lantern", "bunting", "tree", "den", "pond", "generic"];

export default async function AdminDecor() {
  await requireAdmin("/admin/decor");
  const supabase = await createClient();
  const items = many<Decor>(await supabase.from("decor_catalog").select("*").order("sort_order"), "admin decor");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Decorations</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Prices are charged by the server, so changes apply to the next purchase. Hiding an item removes it from the shop;
          players who already own it keep it.
        </p>
      </div>

      <div className="grid gap-3">
        {items.map((d) => (
          <Card key={d.id} className="p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-sage">
                  <DecorArt artKey={d.art_key} title="" className="h-11 w-11" />
                </span>
                <span className="flex-1">
                  <span className="font-display text-lg font-bold">{d.name}</span>{" "}
                  <span className="text-sm text-ink-soft">· {d.price} acorns · {d.slot_category}</span>
                </span>
                {!d.enabled && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">hidden</span>}
              </summary>
              <div className="mt-4">
                <ActionForm action={saveDecor.bind(null, d.id)}>
                  <DecorFields decor={d} />
                </ActionForm>
              </div>
            </details>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Add a decoration</h2>
        <ActionForm action={saveDecor.bind(null, null)} submitLabel="Add decoration">
          <DecorFields />
        </ActionForm>
      </Card>
    </div>
  );
}

function DecorFields({ decor }: { decor?: Decor }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Name"><input name="name" required maxLength={60} defaultValue={decor?.name} className={adminInput} /></Field>
      <Field label="Slug (permanent)">
        <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={decor?.slug} readOnly={!!decor} className={adminInput} />
      </Field>
      <Field label="Price (acorns)"><input type="number" name="price" min={0} required defaultValue={decor?.price ?? 25} className={adminInput} /></Field>
      <Field label="Spot type" hint="Where it can be placed in the sanctuary">
        <select name="slot_category" defaultValue={decor?.slot_category ?? "small"} className={adminInput}>
          <option value="small">Small (ground)</option>
          <option value="large">Big</option>
          <option value="hanging">Hanging</option>
        </select>
      </Field>
      <Field label="Artwork" hint="Placeholder illustration until custom decor art is supported">
        <select name="art_key" defaultValue={decor?.art_key ?? "generic"} className={adminInput}>
          {ART_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </Field>
      <Field label="Sort order"><input type="number" name="sort_order" min={0} defaultValue={decor?.sort_order ?? 100} className={adminInput} /></Field>
      <div className="md:col-span-2">
        <Field label="Description"><input name="description" maxLength={300} defaultValue={decor?.description ?? ""} className={adminInput} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" name="enabled" defaultChecked={decor?.enabled ?? true} className="h-5 w-5 accent-forest" /> Show in shop
      </label>
    </div>
  );
}
