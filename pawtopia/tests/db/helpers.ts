import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import pg from "pg";

// Integration tests run against a Supabase-compatible stack:
//   - `npx supabase start` (set the env vars from `supabase status`), or
//   - the Docker-free stack in tests/local-stack (defaults below).
const API_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres";
const JWT_SECRET = process.env.TEST_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";

export const dbTestsEnabled = process.env.PAWTOPIA_DB_TESTS === "1";

function b64(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function signJwt(payload: Record<string, unknown>) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload });
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

const ANON_KEY = signJwt({ role: "anon", exp: 2100000000 });
const SERVICE_KEY = signJwt({ role: "service_role", exp: 2100000000 });

export const pool = new pg.Pool({ connectionString: DB_URL, max: 5 });

function clientFor(token: string): SupabaseClient {
  return createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
export const anonClient = () => clientFor(ANON_KEY);
export const serviceClient = () => clientFor(SERVICE_KEY);

export type TestUser = { id: string; email: string; token: string; db: SupabaseClient };

export async function createUser(opts: { onboard?: boolean; admin?: boolean } = {}): Promise<TestUser> {
  const id = crypto.randomUUID();
  const email = `t-${id.slice(0, 8)}@example.test`;
  await pool.query(
    // Token columns are '' (not NULL), matching rows written by Supabase Auth itself.
    `insert into auth.users (id, email, aud, role, email_confirmed_at, created_at, updated_at, instance_id,
       confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
       phone_change, phone_change_token, reauthentication_token)
     values ($1, $2, 'authenticated', 'authenticated', now(), now(), now(), '00000000-0000-0000-0000-000000000000',
       '', '', '', '', '', '', '', '')`,
    [id, email],
  );
  if (opts.admin) {
    await pool.query(`insert into public.app_roles (user_id, role, granted_by) values ($1, 'admin', 'test')`, [id]);
  }
  const token = signJwt({ sub: id, role: "authenticated", aud: "authenticated", email });
  const user = { id, email, token, db: clientFor(token) };
  if (opts.onboard !== false) {
    const { data, error } = await user.db.rpc("complete_onboarding", {
      p_display_name: "Tester",
      p_timezone: "America/New_York",
      p_preferred_habitat: "forest",
      p_accept_terms: true,
      p_confirm_age: true,
      p_terms_version: "test",
      p_marketing_opt_in: false,
    });
    if (error || data?.status !== "ok") throw new Error(`onboarding failed: ${error?.message ?? JSON.stringify(data)}`);
  }
  return user;
}

export async function setLaunchMode(mode: "open" | "waitlist") {
  await pool.query(
    `update public.app_settings set value = jsonb_set(value, '{mode}', to_jsonb($1::text)) where key = 'launch'`,
    [mode],
  );
}

/** Moves a player's care history back in time so cooldowns/daily caps can be tested. */
export async function ageCareActions(userId: string, seconds: number) {
  await pool.query(
    `update public.care_actions set performed_at = performed_at - make_interval(secs => $2) where user_id = $1`,
    [userId, seconds],
  );
}
