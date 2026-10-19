import { Field, adminInput } from "./fields";
import type { Animal, Habitat } from "@/lib/types";

export function AnimalFields({ animal, habitats }: { animal?: Animal; habitats: Pick<Habitat, "slug" | "name">[] }) {
  const c = animal?.colors ?? {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name *"><input name="name" required maxLength={40} defaultValue={animal?.name} className={adminInput} /></Field>
      <Field label="Species *"><input name="species" required maxLength={40} defaultValue={animal?.species} placeholder="Raccoon" className={adminInput} /></Field>
      <Field label="Slug * (permanent URL)" hint="Lowercase, numbers and dashes, e.g. maple">
        <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={animal?.slug} className={adminInput} />
      </Field>
      <Field label="Habitat">
        <select name="habitat_slug" defaultValue={animal?.habitat_slug ?? "forest-glade"} className={adminInput}>
          {habitats.map((h) => (
            <option key={h.slug} value={h.slug}>{h.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Placeholder art style" hint="Used until official art is uploaded">
        <select name="placeholder_style" defaultValue={animal?.placeholder_style ?? "generic"} className={adminInput}>
          {["raccoon", "otter", "penguin", "fox", "squirrel", "generic"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Personality tags" hint="Comma separated, up to 8">
        <input name="personality_tags" defaultValue={animal?.personality_tags.join(", ")} placeholder="curious, a little shy" className={adminInput} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Tagline (≤140)"><input name="tagline" maxLength={140} defaultValue={animal?.tagline ?? ""} className={adminInput} /></Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Bio (required to publish)">
          <textarea name="bio" maxLength={2000} defaultValue={animal?.bio ?? ""} className={`${adminInput} min-h-28`} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Distinct markings / appearance" hint="Helps keep the character consistent across videos and game art">
          <textarea name="appearance" maxLength={1000} defaultValue={animal?.appearance ?? ""} className={`${adminInput} min-h-20`} />
        </Field>
      </div>
      <fieldset className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">
        <legend className="mb-2 text-sm font-bold">Placeholder colours</legend>
        {(["fur", "mask", "accent", "belly"] as const).map((k) => (
          <Field key={k} label={k}>
            <input type="color" name={k} defaultValue={c[k] ?? "#8B5A3C"} className="h-11 w-full rounded-xl border-2 border-sage-200" />
          </Field>
        ))}
      </fieldset>
      <Field label="Sort order"><input type="number" name="sort_order" min={0} defaultValue={animal?.sort_order ?? 100} className={adminInput} /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold">
        <input type="checkbox" name="featured" defaultChecked={animal?.featured} className="h-5 w-5 accent-forest" /> Featured
      </label>
    </div>
  );
}
