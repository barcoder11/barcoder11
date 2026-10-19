import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";

// Stand-ins for the cookie store, the service-role client and the logger.
const env = vi.hoisted(() => ({
  state: {
    admin: null as null | { upserts: unknown[]; error: { code: string } | null },
    logs: [] as { level: string; message: string; fields?: unknown }[],
  },
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, delete: () => {} }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const admin = env.state.admin;
    if (!admin) return null;
    return {
      from: () => ({
        upsert: async (row: unknown) => {
          admin.upserts.push(row);
          return { error: admin.error };
        },
      }),
    };
  },
}));
vi.mock("@/lib/log", () => {
  const record = (level: string) => (message: string, fields?: unknown) =>
    env.state.logs.push({ level, message, fields });
  return { log: { info: record("info"), warn: record("warn"), error: record("error") } };
});

const { finishSignIn } = await import("./post-sign-in");

/** A signed-in session client for `email` whose profile has finished onboarding. */
function session(email: string, signupError: { code: string } | null = null) {
  return {
    auth: { getClaims: async () => ({ data: { claims: { sub: "user-1", email, user_metadata: {} } } }) },
    rpc: async () => ({ data: null, error: signupError }),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { onboarding_completed_at: "2026-10-01T00:00:00Z" } }) }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

beforeEach(() => {
  env.state.admin = { upserts: [], error: null };
  env.state.logs = [];
  vi.stubEnv("ADMIN_EMAILS", "owner@example.com");
});
afterEach(() => vi.unstubAllEnvs());

describe("finishSignIn admin bootstrap", () => {
  it("makes an ADMIN_EMAILS user an admin, whatever the capitalisation", async () => {
    expect(await finishSignIn(session("Owner@Example.com"))).toBe("/app");
    expect(env.state.admin?.upserts).toEqual([{ user_id: "user-1", role: "admin", granted_by: "ADMIN_EMAILS" }]);
    expect(env.state.logs).toEqual([]);
  });

  it("leaves everyone else alone", async () => {
    await finishSignIn(session("player@example.com"));
    expect(env.state.admin?.upserts).toEqual([]);
    expect(env.state.logs).toEqual([]);
  });

  it("logs a failed grant instead of failing silently", async () => {
    env.state.admin = { upserts: [], error: { code: "42501" } };
    expect(await finishSignIn(session("owner@example.com"))).toBe("/app");
    expect(env.state.logs).toEqual([{ level: "error", message: "admin bootstrap failed", fields: { code: "42501" } }]);
  });

  it("logs a missing service role key", async () => {
    env.state.admin = null;
    expect(await finishSignIn(session("owner@example.com"))).toBe("/app");
    expect(env.state.logs).toMatchObject([
      { level: "error", message: expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY") },
    ]);
  });

  it("logs a failed signup record without blocking sign-in", async () => {
    expect(await finishSignIn(session("player@example.com", { code: "PGRST301" }))).toBe("/app");
    expect(env.state.logs).toEqual([{ level: "warn", message: "record_signup failed", fields: { code: "PGRST301" } }]);
  });
});
