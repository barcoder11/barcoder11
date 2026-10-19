// First-touch attribution captured from rescue links like
// /r/maple-flood-rescue?utm_source=instagram&utm_medium=reel&utm_campaign=maple_launch&utm_content=reel_001

export const ANON_COOKIE = "pt_aid";
export const FIRST_TOUCH_COOKIE = "pt_ft";
export const NEXT_COOKIE = "pt_next";

export type FirstTouch = {
  rescue_slug?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  at?: string;
};

export function cleanToken(value: string | null | undefined, max = 64): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, max);
  return cleaned || undefined;
}

export function firstTouchFromUrl(pathname: string, params: URLSearchParams): FirstTouch | null {
  const match = pathname.match(/^\/r\/([a-z0-9-]{1,80})\/?$/);
  if (!match) return null;
  const touch: FirstTouch = {
    rescue_slug: match[1],
    source: cleanToken(params.get("utm_source")) ?? "direct",
    medium: cleanToken(params.get("utm_medium")),
    campaign: cleanToken(params.get("utm_campaign")),
    content: cleanToken(params.get("utm_content")),
    at: new Date().toISOString(),
  };
  return touch;
}

export function encodeFirstTouch(t: FirstTouch): string {
  return Buffer.from(JSON.stringify(t)).toString("base64url");
}

export function decodeFirstTouch(raw: string | undefined | null): FirstTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      rescue_slug: cleanToken(parsed.rescue_slug, 80),
      source: cleanToken(parsed.source),
      medium: cleanToken(parsed.medium),
      campaign: cleanToken(parsed.campaign),
      content: cleanToken(parsed.content),
      at: typeof parsed.at === "string" ? parsed.at.slice(0, 40) : undefined,
    };
  } catch {
    return null;
  }
}

export function isUuid(value: string | undefined | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
