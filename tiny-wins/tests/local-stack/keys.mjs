// Prints anon + service_role keys for the local stack (same format as Supabase's).
import { createHmac } from "node:crypto";

const secret = process.env.STACK_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";
const sign = (claims) => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = `${enc({ alg: "HS256", typ: "JWT" })}.${enc(claims)}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
};
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365;
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${sign({ iss: "supabase", role: "anon", iat, exp })}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${sign({ iss: "supabase", role: "service_role", iat, exp })}`);
