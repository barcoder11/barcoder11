import { beforeEach, describe, expect, it, vi } from "vitest";

// Stand-ins for the session lookup, both Supabase clients and Next's data cache.
const env = vi.hoisted(() => {
  const state = {
    configured: true,
    user: null as { id: string } | null,
    version: 1 as number | null, // null: the version can't be read
    store: new Map<string, unknown>(),
    warn: [] as string[],
  };
  const publicClient = {
    kind: "public",
    from: () => ({
      select: () => ({
        maybeSingle: async () =>
          state.version === null
            ? { data: null, error: { code: "42P01" } }
            : { data: { version: state.version }, error: null },
      }),
    }),
  };
  return { state, publicClient };
});

vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: unknown[]) => Promise<unknown>, keyParts: string[]) =>
    async (...args: unknown[]) => {
      const key = JSON.stringify([keyParts, args]);
      if (!env.state.store.has(key)) env.state.store.set(key, await fn(...args));
      return env.state.store.get(key);
    },
}));
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => env.state.configured }));
vi.mock("@/lib/auth", () => ({ getSessionUser: async () => env.state.user }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => env.publicClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ kind: "session" }) }));
vi.mock("@/lib/log", () => ({ log: { warn: (message: string) => env.state.warn.push(message) } }));

const { catalogRead } = await import("./catalog-cache");

function setup() {
  const query = vi.fn(async (db: unknown, slug: string) => `${(db as { kind: string }).kind}:${slug}`);
  return { query, read: catalogRead("test", "empty", query as never) as (slug: string) => Promise<string> };
}

beforeEach(() => {
  Object.assign(env.state, { configured: true, user: null, version: 1, warn: [] });
  env.state.store.clear();
});

describe("catalogRead", () => {
  it("lets anonymous visitors share one cached result per catalog version and arguments", async () => {
    const { query, read } = setup();
    expect(await read("maple")).toBe("public:maple");
    expect(await read("maple")).toBe("public:maple");
    expect(query).toHaveBeenCalledTimes(1);
    await read("ripple"); // different arguments, different entry
    expect(query).toHaveBeenCalledTimes(2);
    env.state.version = 2; // content changed somewhere
    expect(await read("maple")).toBe("public:maple");
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("always reads live with the session for signed-in visitors", async () => {
    const { query, read } = setup();
    env.state.user = { id: "u1" };
    expect(await read("maple")).toBe("session:maple");
    expect(await read("maple")).toBe("session:maple");
    expect(query).toHaveBeenCalledTimes(2);
    expect(env.state.store.size).toBe(0);
  });

  it("returns the empty result without querying before Supabase is configured", async () => {
    const { query, read } = setup();
    env.state.configured = false;
    expect(await read("maple")).toBe("empty");
    expect(query).not.toHaveBeenCalled();
  });

  it("serves uncached public reads, with a warning, if the version can't be read", async () => {
    const { query, read } = setup();
    env.state.version = null;
    expect(await read("maple")).toBe("public:maple");
    expect(await read("maple")).toBe("public:maple");
    expect(query).toHaveBeenCalledTimes(2);
    expect(env.state.warn[0]).toMatch(/uncached/);
  });
});
