// Prints anon/service_role JWTs signed with the local stack's secret.
import crypto from "node:crypto";

export const JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

function b64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

export function sign(payload) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

const exp = 2100000000; // fixed so keys are stable between runs
export const ANON_KEY = sign({ iss: "supabase-demo", role: "anon", exp });
export const SERVICE_KEY = sign({ iss: "supabase-demo", role: "service_role", exp });

if (process.argv[1]?.endsWith("keys.mjs")) {
  console.log(`ANON_KEY=${ANON_KEY}`);
  console.log(`SERVICE_KEY=${SERVICE_KEY}`);
}
