// Builds the share links admins paste into TikTok / Instagram / Facebook posts.

export type Platform = "tiktok" | "instagram" | "facebook";

export const PLATFORM_DEFAULTS: Record<Platform, { label: string; medium: string }> = {
  tiktok: { label: "TikTok", medium: "video" },
  instagram: { label: "Instagram", medium: "reel" },
  facebook: { label: "Facebook", medium: "video" },
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function buildRescueLink(opts: {
  siteUrl: string;
  rescueSlug: string;
  platform: Platform;
  campaign?: string;
  content?: string;
  medium?: string;
}) {
  const url = new URL(`/r/${opts.rescueSlug}`, opts.siteUrl);
  url.searchParams.set("utm_source", opts.platform);
  url.searchParams.set("utm_medium", slugify(opts.medium || PLATFORM_DEFAULTS[opts.platform].medium));
  const campaign = slugify(opts.campaign || `${opts.rescueSlug}_launch`);
  url.searchParams.set("utm_campaign", campaign);
  if (opts.content) url.searchParams.set("utm_content", slugify(opts.content));
  return url.toString();
}
