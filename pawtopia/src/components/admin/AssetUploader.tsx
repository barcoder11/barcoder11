"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerAsset } from "@/app/admin/actions";
import { Button, Notice } from "@/components/ui";
import { getBrowserClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/env";
import { adminInput, Field } from "./fields";

const STATES = [
  ["idle", "Idle (default pose / loop)"],
  ["happy", "Happy"],
  ["comforted", "Comforted (cuddle)"],
  ["snacking", "Snacking"],
  ["playing", "Playing"],
  ["resting", "Resting"],
  ["avatar", "Avatar (transparent portrait)"],
  ["cover", "Cover image"],
  ["poster", "Video poster (rescue page)"],
  ["teaser", "Teaser video (6–12s, rescue page)"],
] as const;

const IMAGE_TYPES = ["image/png", "image/webp", "image/jpeg", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const EXT: Record<string, string> = {
  "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm",
};

async function dimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    if (IMAGE_TYPES.includes(file.type)) {
      const bmp = await createImageBitmap(file);
      return { width: bmp.width, height: bmp.height };
    }
    return await new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve({ width: v.videoWidth || null, height: v.videoHeight || null });
      v.onerror = () => resolve({ width: null, height: null });
      v.src = URL.createObjectURL(file);
    });
  } catch {
    return { width: null, height: null };
  }
}

/** Uploads straight from the browser to Supabase Storage (admin RLS), then registers the asset. */
export function AssetUploader({ animalId, animalSlug }: { animalId: string; animalSlug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const file = form.get("file") as File | null;
    const state = String(form.get("state"));
    const alt = String(form.get("alt") ?? "").trim();
    setMsg(null);
    if (!file || file.size === 0) return setMsg({ tone: "error", text: "Choose a file." });
    if (![...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.type)) return setMsg({ tone: "error", text: "Use PNG, WebP, JPEG, GIF, MP4 or WebM. (SVG is not allowed.)" });
    if (IMAGE_TYPES.includes(file.type) && file.size > 10 * 1024 * 1024) return setMsg({ tone: "error", text: "Images must be 10 MB or smaller." });
    if (file.size > 50 * 1024 * 1024) return setMsg({ tone: "error", text: "Videos must be 50 MB or smaller." });
    if (alt.length < 3) return setMsg({ tone: "error", text: "Alt text is required (describe what's shown)." });

    setBusy(true);
    const { width, height } = await dimensions(file);
    const path = `animals/${animalSlug}/${state}-${crypto.randomUUID()}.${EXT[file.type]}`;
    const supabase = getBrowserClient();
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (error) {
      setBusy(false);
      return setMsg({ tone: "error", text: `Upload failed: ${error.message}` });
    }
    const res = await registerAsset({
      animalId,
      state: state as (typeof STATES)[number][0],
      path,
      mime: file.type,
      size: file.size,
      width,
      height,
      alt,
      credits: String(form.get("credits") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
    setBusy(false);
    if (res.error) return setMsg({ tone: "error", text: res.error });
    setMsg({ tone: "success", text: res.message ?? "Uploaded." });
    formEl.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <Field label="Animation state / slot">
        <select name="state" className={adminInput} defaultValue="idle">
          {STATES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="File" hint="Transparent PNG/WebP for sprites · MP4/WebM loops · max 10 MB images / 50 MB video">
        <input type="file" name="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")} className="text-sm" data-testid="asset-file" />
      </Field>
      <Field label="Alt text *" hint="Describe the image for screen readers">
        <input name="alt" maxLength={300} className={adminInput} placeholder="Maple the raccoon hugging a blanket" />
      </Field>
      <Field label="Credits">
        <input name="credits" maxLength={300} className={adminInput} placeholder="Art: Studio Name" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Source / licence notes (private)">
          <input name="notes" maxLength={1000} className={adminInput} placeholder="Generated with … / licensed from …" />
        </Field>
      </div>
      {msg && <Notice tone={msg.tone} className="md:col-span-2">{msg.text}</Notice>}
      <div>
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload asset"}</Button>
      </div>
    </form>
  );
}
