import { Field, adminInput } from "./fields";
import type { AnimalAsset, RescueStory } from "@/lib/types";

export function RescueFields({
  rescue,
  animals,
  assets = [],
  defaultAnimalId,
}: {
  rescue?: RescueStory;
  animals: { id: string; name: string; status: string }[];
  assets?: AnimalAsset[];
  defaultAnimalId?: string;
}) {
  const posters = assets.filter((a) => a.media_kind === "image");
  const videos = assets.filter((a) => a.media_kind === "video");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Title *">
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={rescue?.title}
          className={adminInput}
          placeholder="Maple and the Hollow Creek Flood"
        />
      </Field>
      <Field label="Slug * (link path /r/…)" hint="e.g. maple-flood-rescue">
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={rescue?.slug}
          className={adminInput}
        />
      </Field>
      <Field label="Animal *">
        <select
          name="animal_id"
          required
          defaultValue={rescue?.animal_id ?? defaultAnimalId ?? ""}
          className={adminInput}
        >
          <option value="" disabled>
            Choose…
          </option>
          {animals.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.status})
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Season">
          <input type="number" name="season" min={1} defaultValue={rescue?.season ?? ""} className={adminInput} />
        </Field>
        <Field label="Episode">
          <input type="number" name="episode" min={1} defaultValue={rescue?.episode ?? ""} className={adminInput} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Synopsis (≤600)">
          <textarea
            name="synopsis"
            maxLength={600}
            defaultValue={rescue?.synopsis ?? ""}
            className={`${adminInput} min-h-20`}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Story text (≤5000)">
          <textarea
            name="story_body"
            maxLength={5000}
            defaultValue={rescue?.story_body ?? ""}
            className={`${adminInput} min-h-32`}
          />
        </Field>
      </div>
      <Field label="TikTok video URL">
        <input
          name="tiktok_url"
          type="url"
          defaultValue={rescue?.tiktok_url ?? ""}
          className={adminInput}
          placeholder="https://www.tiktok.com/@…/video/…"
        />
      </Field>
      <Field label="Instagram post URL">
        <input
          name="instagram_url"
          type="url"
          defaultValue={rescue?.instagram_url ?? ""}
          className={adminInput}
          placeholder="https://www.instagram.com/reel/…"
        />
      </Field>
      <Field label="Facebook post URL">
        <input name="facebook_url" type="url" defaultValue={rescue?.facebook_url ?? ""} className={adminInput} />
      </Field>
      <Field label="YouTube URL">
        <input name="youtube_url" type="url" defaultValue={rescue?.youtube_url ?? ""} className={adminInput} />
      </Field>
      {rescue && (
        <>
          <Field label="Poster image" hint="Upload on the animal page (poster/cover state)">
            <select name="poster_asset_id" defaultValue={rescue.poster_asset_id ?? ""} className={adminInput}>
              <option value="">Automatic</option>
              {posters.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.state} — {a.alt_text.slice(0, 40)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Teaser video" hint="Upload on the animal page (teaser state)">
            <select name="teaser_asset_id" defaultValue={rescue.teaser_asset_id ?? ""} className={adminInput}>
              <option value="">Automatic</option>
              {videos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.state} — {a.alt_text.slice(0, 40)}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <p className="rounded-xl bg-honey/25 px-3 py-2 text-sm font-bold md:col-span-2">
        ✨ The “Fictional AI-generated rescue story — Virtual adoption only” disclosure is always shown and can&apos;t
        be turned off.
      </p>
    </div>
  );
}
