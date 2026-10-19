"use client";
import { useState } from "react";
import { buildRescueLink, PLATFORM_DEFAULTS, type Platform } from "@/lib/links";
import { adminInput, Field } from "./fields";

export function LinkGenerator({ siteUrl, rescueSlug, published }: { siteUrl: string; rescueSlug: string; published: boolean }) {
  const [campaign, setCampaign] = useState(`${rescueSlug.split("-")[0]}_launch`);
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const links = (Object.keys(PLATFORM_DEFAULTS) as Platform[]).map((p) => ({
    platform: p,
    label: PLATFORM_DEFAULTS[p].label,
    url: buildRescueLink({ siteUrl, rescueSlug, platform: p, campaign, content }),
  }));

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="grid gap-4">
      {!published && (
        <p className="rounded-xl bg-[#FCEFD6] px-3 py-2 text-sm font-semibold text-[#7A4B12]">
          This episode isn&apos;t published yet — links will show a 404 to visitors until you publish.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Campaign (utm_campaign)">
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} className={adminInput} maxLength={64} />
        </Field>
        <Field label="Content / post id (utm_content, optional)" hint="e.g. reel_001 — tells posts apart">
          <input value={content} onChange={(e) => setContent(e.target.value)} className={adminInput} maxLength={64} />
        </Field>
      </div>
      <ul className="grid gap-2">
        {links.map((l) => (
          <li key={l.platform} className="grid gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[110px_1fr_auto] sm:items-center">
            <span className="font-bold">{l.label}</span>
            <code className="break-all text-xs" data-testid={`link-${l.platform}`}>{l.url}</code>
            <button type="button" onClick={() => copy(l.url)} className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-cream">
              {copied === l.url ? "Copied!" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-soft">
        Tip: TikTok only allows clickable profile links on eligible accounts — put the link in your bio and say “link in bio”.
        Instagram and Facebook can use link stickers / descriptions.
      </p>
    </div>
  );
}
