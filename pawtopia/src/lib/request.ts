import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/** Public origin for links in emails: the configured site URL, else the request host. */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return env.siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : env.siteUrl;
}

/**
 * Privacy-preserving client key for rate limiting: an HMAC of the caller's IP
 * and the current UTC date. Raw IPs are never stored, and keys can't be linked
 * across days. On Vercel, x-forwarded-for / x-real-ip are set by the platform.
 */
export async function clientKey(scope: string) {
  const h = await headers();
  const ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "pawtopia-dev";
  const day = new Date().toISOString().slice(0, 10);
  return `${scope}:${crypto.createHmac("sha256", secret).update(`${day}|${ip}`).digest("hex").slice(0, 32)}`;
}
