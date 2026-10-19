import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** One-way hash of an IP address for rate limiting (raw IPs are never stored). */
export function hashIp(ip: string): string {
  const salt = process.env.WAITLIST_IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "tiny-wins";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
