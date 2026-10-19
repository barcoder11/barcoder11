import crypto from "node:crypto";

/** Random URL-safe token; only its SHA-256 hash is stored. */
export function newToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
