// Prevents open redirects: only same-site paths under known prefixes are allowed.

const ALLOWED_PREFIXES = ["/app", "/animals/", "/r/", "/onboarding", "/admin"];

export function sanitizeNext(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || typeof raw !== "string") return fallback;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (value.length > 300) return fallback;
  // Must be a plain absolute path: no scheme, no protocol-relative, no backslashes or control chars.
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (value.includes("://")) return fallback;
  const pathOnly = value.split(/[?#]/)[0];
  if (pathOnly.split("/").some((seg) => seg === "..")) return fallback;
  const allowed = ALLOWED_PREFIXES.some((p) => pathOnly === p.replace(/\/$/, "") || pathOnly.startsWith(p));
  return allowed ? value : fallback;
}
