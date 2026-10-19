import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  ageCareActions,
  anonClient,
  serviceClient,
  createUser,
  dbTestsEnabled,
  pool,
  setLaunchMode,
  type TestUser,
} from "./helpers";

const uuid = () => crypto.randomUUID();

async function wallet(u: TestUser) {
  const { data } = await u.db.from("wallets").select("acorns").single();
  return data?.acorns as number;
}

async function adopt(u: TestUser, slug = "maple") {
  const { data, error } = await u.db.rpc("adopt_animal", { p_animal_slug: slug, p_nickname: null });
  if (error) throw error;
  return data as { status: string; user_animal_id: string; welcome_acorns?: number };
}

async function care(u: TestUser, id: string, action: string, key = uuid()) {
  const { data, error } = await u.db.rpc("perform_care", {
    p_user_animal_id: id,
    p_action: action,
    p_idempotency_key: key,
  });
  if (error) throw error;
  return data as Record<string, any>;
}

describe.skipIf(!dbTestsEnabled)("public catalog", () => {
  it("anonymous visitors see Maple and her rescue story with the fiction disclosure", async () => {
    const db = anonClient();
    const { data: rescue, error } = await db
      .from("rescue_stories")
      .select("slug, title, ai_fiction_disclosure, animals(slug, name, status)")
      .eq("slug", "maple-flood-rescue")
      .single();
    expect(error).toBeNull();
    expect(rescue?.ai_fiction_disclosure).toBe(true);
    expect((rescue?.animals as any).slug).toBe("maple");
  });

  it("coming-soon animals are visible, drafts are not", async () => {
    await pool.query(
      `insert into public.animals (slug, name, species, status, bio) values ('secret-draft', 'Secret', 'Owl', 'draft', 'x')
       on conflict (slug) do nothing`,
    );
    const { data } = await anonClient().from("animals").select("slug, status");
    const slugs = (data ?? []).map((a) => a.slug);
    expect(slugs).toContain("maple");
    expect(slugs).toContain("pebble");
    expect(slugs).not.toContain("secret-draft");
  });

  it("chapter bodies are hidden from visitors; the outline is public", async () => {
    const db = anonClient();
    const { data: chapters } = await db.from("story_chapters").select("*");
    expect(chapters ?? []).toHaveLength(0);
    const { data: maple } = await db.from("animals").select("id").eq("slug", "maple").single();
    const { data: outline } = await db.rpc("animal_chapter_outline", { p_animal_id: maple!.id });
    expect(outline).toHaveLength(5);
    expect(outline[0]).not.toHaveProperty("body");
  });

  it("visitors cannot write anything directly", async () => {
    const db = anonClient();
    const r1 = await db.from("animals").insert({ slug: "hack", name: "Hack", species: "x" });
    expect(r1.error).not.toBeNull();
    const r2 = await db.from("app_settings").update({ value: { mode: "open" } }).eq("key", "launch").select();
    expect(r2.data ?? []).toHaveLength(0);
    const r3 = await db.rpc("adopt_animal", { p_animal_slug: "maple", p_nickname: null });
    expect(r3.error).not.toBeNull();
  });
});

describe.skipIf(!dbTestsEnabled)("adoption", () => {
  beforeAll(() => setLaunchMode("open"));

  it("requires onboarding first", async () => {
    const u = await createUser({ onboard: false });
    expect((await adopt(u)).status).toBe("onboarding_required");
  });

  it("creates exactly one adoption and one welcome gift, even under concurrent double taps", async () => {
    const u = await createUser();
    const results = await Promise.all([adopt(u), adopt(u), adopt(u), adopt(u)]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === "adopted")).toHaveLength(1);
    expect(statuses.filter((s) => s === "already_adopted")).toHaveLength(3);
    const ids = new Set(results.map((r) => r.user_animal_id));
    expect(ids.size).toBe(1);
    expect(await wallet(u)).toBe(50);
    const { rows } = await pool.query(`select count(*)::int as n from public.user_animals where user_id = $1`, [u.id]);
    expect(rows[0].n).toBe(1);
    // Chapter 1 unlocks on arrival.
    const { data: unlocked } = await u.db.from("user_story_unlocks").select("chapter_id");
    expect(unlocked).toHaveLength(1);
  });

  it("two players adopt Maple independently and cannot see each other's data", async () => {
    const a = await createUser();
    const b = await createUser();
    const ra = await adopt(a);
    const rb = await adopt(b);
    expect(ra.user_animal_id).not.toBe(rb.user_animal_id);
    await care(a, ra.user_animal_id, "comfort");

    const { data: bSees } = await b.db.from("user_animals").select("id");
    expect(bSees?.map((r) => r.id)).toEqual([rb.user_animal_id]);
    const { data: bCare } = await b.db.from("care_actions").select("id");
    expect(bCare).toHaveLength(0);
    const { data: bLedger } = await b.db.from("currency_ledger").select("user_id");
    expect(new Set(bLedger?.map((r) => r.user_id))).toEqual(new Set([b.id]));
    const { data: bProfiles } = await b.db.from("profiles").select("user_id");
    expect(bProfiles?.map((p) => p.user_id)).toEqual([b.id]);

    // B cannot care for A's Maple.
    const stolen = await care(b, ra.user_animal_id, "play");
    expect(stolen.status).toBe("not_found");
  });

  it("coming-soon animals cannot be adopted", async () => {
    const u = await createUser();
    expect((await adopt(u, "pebble")).status).toBe("not_available");
  });

  it("waitlist mode blocks adoption for players", async () => {
    const u = await createUser();
    await setLaunchMode("waitlist");
    try {
      expect((await adopt(u)).status).toBe("closed");
    } finally {
      await setLaunchMode("open");
    }
  });
});

describe.skipIf(!dbTestsEnabled)("care and rewards", () => {
  let u: TestUser;
  let ua: string;

  beforeAll(async () => {
    await setLaunchMode("open");
    u = await createUser();
    ua = (await adopt(u)).user_animal_id;
  });

  it("awards XP and acorns from server config, ignoring anything the client sends", async () => {
    const r = await care(u, ua, "comfort");
    expect(r.status).toBe("ok");
    expect(r.xp_awarded).toBe(5);
    expect(r.acorns_awarded).toBe(5);
    expect(r.balance).toBe(55);
    expect(r.first_care).toBe(true);
  });

  it("replaying the same idempotency key never pays twice", async () => {
    await ageCareActions(u.id, 3600);
    const key = uuid();
    const [r1, r2, r3] = await Promise.all([care(u, ua, "snack", key), care(u, ua, "snack", key), care(u, ua, "snack", key)]);
    const statuses = [r1.status, r2.status, r3.status].sort();
    expect(statuses).toEqual(["ok", "replay", "replay"]);
    expect(await wallet(u)).toBe(60);
    const { rows } = await pool.query(`select count(*)::int n from public.care_actions where idempotency_key = $1`, [key]);
    expect(rows[0].n).toBe(1);
  });

  it("enforces per-action cooldowns", async () => {
    const r = await care(u, ua, "snack");
    expect(r.status).toBe("cooldown");
    expect(r.retry_after_seconds).toBeGreaterThan(0);
  });

  it("grants the first-care gift once comfort, snack and play are done", async () => {
    const r = await care(u, ua, "play");
    expect(r.status).toBe("ok");
    expect(r.gift?.slug).toBe("soft-blanket");
    const { data: inv } = await u.db.from("user_inventory").select("decor_catalog(slug)");
    expect(inv?.map((i: any) => i.decor_catalog.slug)).toContain("soft-blanket");
  });

  it("caps acorns at three distinct activities per day, but keeps the fun going", async () => {
    await ageCareActions(u.id, 3600);
    const r = await care(u, ua, "rest");
    expect(r.status).toBe("ok");
    expect(r.acorns_awarded).toBe(0); // 4th distinct activity today
    expect(r.xp_awarded).toBe(3);
    // Repeating an activity already rewarded today: still XP, no extra acorns.
    const again = await care(u, ua, "comfort");
    expect(again.status).toBe("ok");
    expect(again.acorns_awarded).toBe(0);
    expect(again.xp_awarded).toBe(5);
  });

  it("caps daily bond XP and never goes backwards", async () => {
    for (let i = 0; i < 12; i++) {
      await ageCareActions(u.id, 3600);
      await care(u, ua, (["comfort", "snack", "play", "rest"] as const)[i % 4]);
    }
    const { data } = await u.db.from("user_animals").select("bond_xp, level, phase").eq("id", ua).single();
    expect(data!.bond_xp).toBe(60); // daily_xp_cap
    expect(data!.level).toBeGreaterThanOrEqual(3);
    // 60 XP passes the 25 XP threshold -> chapter 2 / feeling_safe
    expect(data!.phase).toBe("feeling_safe");
    const { data: unlocks } = await u.db.from("user_story_unlocks").select("id");
    expect(unlocks).toHaveLength(2);
    // Unlocked chapter text is now readable by its owner.
    const { data: chapters } = await u.db.from("story_chapters").select("ordinal, body").order("ordinal");
    expect(chapters?.map((c) => c.ordinal)).toEqual([1, 2]);
  });

  it("players cannot edit economy columns or their wallet directly", async () => {
    const r1 = await u.db.from("wallets").update({ acorns: 999999 }).eq("user_id", u.id).select();
    expect(r1.error ?? (r1.data?.length === 0 ? "blocked" : null)).not.toBeNull();
    const r2 = await u.db.from("user_animals").update({ bond_xp: 9999 }).eq("id", ua).select();
    expect(r2.error ?? (r2.data?.length === 0 ? "blocked" : null)).not.toBeNull();
    const r3 = await u.db.from("currency_ledger").insert({
      user_id: u.id, delta: 1000, balance_after: 1000, source_type: "hack", idempotency_key: uuid(),
    });
    expect(r3.error).not.toBeNull();
    const r4 = await u.db.rpc("_credit", {
      p_user: u.id, p_delta: 1000, p_source_type: "hack", p_source_id: "x", p_key: uuid(),
    });
    expect(r4.error).not.toBeNull();
    const { data } = await u.db.from("user_animals").select("bond_xp").eq("id", ua).single();
    expect(data!.bond_xp).toBe(60);
  });

  it("first_care_completed is recorded exactly once", async () => {
    const { rows } = await pool.query(
      `select count(*)::int n from public.attribution_events where user_id = $1 and event_type = 'first_care_completed'`,
      [u.id],
    );
    expect(rows[0].n).toBe(1);
  });
});

describe.skipIf(!dbTestsEnabled)("shop and sanctuary", () => {
  let u: TestUser;

  beforeAll(async () => {
    await setLaunchMode("open");
    u = await createUser();
    await adopt(u); // 50 acorns
  });

  const buy = async (slug: string, key = uuid()) => {
    const { data, error } = await u.db.rpc("purchase_decor", { p_decor_slug: slug, p_idempotency_key: key });
    if (error) throw error;
    return data as Record<string, any>;
  };

  it("rejects purchases the player cannot afford", async () => {
    const r = await buy("lily-pond"); // 80
    expect(r.status).toBe("insufficient_funds");
    expect(await wallet(u)).toBe(50);
  });

  it("concurrent purchases can never overdraw the wallet", async () => {
    // 50 acorns: lantern (40) + leaf-bunting (35) + toy-ball (30) cannot all fit.
    const results = await Promise.all([buy("lantern"), buy("leaf-bunting"), buy("toy-ball")]);
    const bought = results.filter((r) => r.status === "purchased");
    expect(bought).toHaveLength(1);
    const bal = await wallet(u);
    expect(bal).toBeGreaterThanOrEqual(0);
    const { rows } = await pool.query(
      `select coalesce(sum(delta),0)::int s from public.currency_ledger where user_id = $1`,
      [u.id],
    );
    expect(rows[0].s).toBe(bal); // ledger and wallet agree
  });

  it("buying the same item twice (or replaying) never duplicates it", async () => {
    await pool.query(`update public.wallets set acorns = acorns + 100 where user_id = $1`, [u.id]);
    await pool.query(
      `insert into public.currency_ledger (user_id, delta, balance_after, source_type, idempotency_key)
       select user_id, 100, acorns, 'test_grant', gen_random_uuid()::text from public.wallets where user_id = $1`,
      [u.id],
    );
    const key = uuid();
    const results = await Promise.all([buy("flower-patch", key), buy("flower-patch", key), buy("flower-patch")]);
    expect(results.filter((r) => r.status === "purchased")).toHaveLength(1);
    expect(results.every((r) => ["purchased", "replay", "already_owned"].includes(r.status))).toBe(true);
    const { data: inv } = await u.db.from("user_inventory").select("quantity, decor_catalog!inner(slug)").eq("decor_catalog.slug", "flower-patch");
    expect(inv).toHaveLength(1);
    expect(inv![0].quantity).toBe(1);
  });

  it("validates placement against owned items and the habitat's slot manifest", async () => {
    const place = async (slot: string, slug: string) =>
      (await u.db.rpc("place_decor", { p_slot_id: slot, p_decor_slug: slug })).data as Record<string, any>;
    expect((await place("small-1", "lily-pond")).status).toBe("not_owned");
    expect((await place("nowhere", "flower-patch")).status).toBe("invalid_slot");
    expect((await place("hanging-left", "flower-patch")).status).toBe("wrong_slot");
    expect((await place("small-1", "flower-patch")).status).toBe("placed");
    // Moving an item to a new slot frees the old one.
    const moved = await place("small-2", "flower-patch");
    expect(moved.placements).toEqual([{ slot_id: "small-2", decor_slug: "flower-patch" }]);
    const removed = (await u.db.rpc("remove_decor", { p_slot_id: "small-2" })).data as Record<string, any>;
    expect(removed.placements).toEqual([]);
  });
});

describe.skipIf(!dbTestsEnabled)("attribution", () => {
  const track = (args: Record<string, unknown>) =>
    serviceClient().rpc("track_event", {
      p_event_type: "rescue_landing_viewed",
      p_anonymous_id: null,
      p_user_id: null,
      p_rescue_slug: "maple-flood-rescue",
      p_animal_slug: null,
      p_attribution: {},
      p_client_key: `test:${uuid()}`,
      ...args,
    });

  it("can't be written through the public API (server only)", async () => {
    const r = await anonClient().rpc("track_event", {
      p_event_type: "rescue_landing_viewed", p_anonymous_id: uuid(), p_user_id: null, p_rescue_slug: "maple-flood-rescue",
      p_animal_slug: null, p_attribution: {}, p_client_key: "x",
    });
    expect(r.error).not.toBeNull();
    const player = await createUser();
    const r2 = await player.db.rpc("track_event", {
      p_event_type: "rescue_landing_viewed", p_anonymous_id: uuid(), p_user_id: player.id, p_rescue_slug: null,
      p_animal_slug: null, p_attribution: {}, p_client_key: "x",
    });
    expect(r2.error).not.toBeNull();
  });

  it("records landing views, dedupes them, sanitises UTM values and rejects other event types", async () => {
    const anon = uuid();
    const args = {
      p_anonymous_id: anon,
      p_attribution: { source: "Instagram", medium: "reel", campaign: "maple_launch<script>", content: "reel_001" },
    };
    expect((await track(args)).data).toBe(true);
    expect((await track(args)).data).toBe(true);
    const { rows } = await pool.query(`select source, campaign from public.attribution_events where anonymous_id = $1`, [anon]);
    expect(rows).toEqual([{ source: "instagram", campaign: "maple_launchscript" }]);
    expect((await track({ ...args, p_event_type: "animal_adopted" })).error).not.toBeNull();
  });

  it("rate limits floods from one client", async () => {
    const key = `test:${uuid()}`;
    const results: boolean[] = [];
    for (let i = 0; i < 122; i++) {
      const { data } = await track({ p_anonymous_id: uuid(), p_client_key: key });
      results.push(data === true);
    }
    expect(results.slice(0, 120).every(Boolean)).toBe(true);
    expect(results.slice(120)).toEqual([false, false]);
  });

  it("links a visitor's funnel to their account and keeps first touch", async () => {
    const anon = uuid();
    await track({ p_event_type: "adoption_cta_clicked", p_anonymous_id: anon, p_attribution: { source: "tiktok" } });
    const u = await createUser({ onboard: false });
    await u.db.rpc("record_signup", {
      p_anonymous_id: anon,
      p_first_touch: { rescue_slug: "maple-flood-rescue", source: "tiktok", campaign: "maple_launch" },
    });
    // A second sign-in with different attribution must not overwrite first touch.
    await u.db.rpc("record_signup", { p_anonymous_id: null, p_first_touch: { source: "facebook" } });
    const { data: profile } = await u.db.from("profiles").select("first_touch").single();
    expect(profile!.first_touch.source).toBe("tiktok");
    expect(profile!.first_touch.rescue_slug).toBe("maple-flood-rescue");
    const { rows } = await pool.query(
      `select event_type from public.attribution_events where user_id = $1 order by occurred_at`,
      [u.id],
    );
    expect(rows.map((r) => r.event_type)).toEqual(["adoption_cta_clicked", "signup_completed"]);
  });
});

afterAll(async () => {
  await pool.end();
});
