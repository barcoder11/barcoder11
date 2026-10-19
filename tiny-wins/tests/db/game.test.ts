/**
 * Database integration tests: run the real migrations against PostgreSQL
 * (with a small Supabase auth stub) and exercise RLS, rewards, the shop and
 * the waitlist.
 *
 * Requires TEST_DATABASE_URL pointing at an EMPTY, disposable database, e.g.
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/tinywins_test npm run test:db
 * The database is wiped (schemas public + auth dropped) before the run.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { levelForXp, levelUpBonus, xpForLevel } from "@/lib/game/levels";

const url = process.env.TEST_DATABASE_URL;
const root = path.resolve(import.meta.dirname, "../..");

type Json = Record<string, unknown>;
type Quest = { id: string; templateId: string; category: string; xp: number; acorns: number; completedAt: string | null };
type QuestDay = { date: string; swapAvailable: boolean; quests: Quest[] };

let pool: Pool;

async function resetDatabase() {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(`drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;`);
  await c.query(readFileSync(path.join(root, "supabase/tests/supabase-stub.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await c.query(readFileSync(path.join(dir, f), "utf8"));
  }
  await c.end();
}

/** Run a query as a signed-in Supabase user (role authenticated + JWT sub). */
async function asUser<T = unknown>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${uid ? "authenticated" : "anon"}`);
    if (uid) await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]);
    const res = await c.query(sql, params);
    await c.query("commit");
    return res.rows as T[];
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

async function rpc<T = Json>(uid: string, fn: string, args: unknown[] = []): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await asUser<{ r: T }>(uid, `select public.${fn}(${placeholders}) as r`, args);
  return rows[0].r;
}

async function admin<T = Json>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

async function asService<T = Json>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role service_role");
    const res = await c.query(sql, params);
    await c.query("commit");
    return res.rows as T[];
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

async function createUser(email = `u${Math.random().toString(36).slice(2)}@example.com`) {
  const [row] = await admin<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email]);
  return row.id;
}

async function onboard(uid: string, goals = ["fitness", "study"], tz = "UTC", step = "small") {
  return rpc(uid, "save_profile", ["Sam", goals, "morning", step, tz, true]);
}

async function profile(uid: string) {
  const [p] = await admin<{ xp: number; level: number; acorns: number; quests_completed: number; days_active: number; current_streak: number }>(
    `select * from public.profiles where id = $1`,
    [uid],
  );
  return p;
}

/** Pretend a day has passed by moving all of a user's quest days back by one. */
async function shiftDaysBack(uid: string, days = 1) {
  // Two hops so the (user, date, slot) unique key never collides mid-update.
  await admin(`update public.daily_quests set quest_date = quest_date - 100000 where user_id = $1`, [uid]);
  await admin(`update public.daily_quests set quest_date = quest_date + (100000 - $2::int) where user_id = $1`, [uid, days]);
  await admin(
    `update public.profiles set last_active_date = last_active_date - $2::int,
       last_swap_date = last_swap_date - $2::int where id = $1`,
    [uid, days],
  );
}

const run = url ? describe : describe.skip;

run("database", () => {
  beforeAll(async () => {
    await resetDatabase();
    pool = new Pool({ connectionString: url, max: 6 });
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  describe("level math", () => {
    it("SQL and TypeScript agree", async () => {
      const samples = [0, 1, 49, 50, 51, 149, 150, 299, 300, 500, 749, 750, 1234, 10_000, 99_999];
      for (const xp of samples) {
        const [r] = await admin<{ l: number }>(`select public.level_for_xp($1) as l`, [xp]);
        expect(r.l, `xp=${xp}`).toBe(levelForXp(xp));
      }
      for (let l = 1; l <= 30; l++) {
        const [r] = await admin<{ x: number; b: number }>(`select public.xp_for_level($1) as x, public.level_up_bonus($1) as b`, [l]);
        expect(r.x).toBe(xpForLevel(l));
        expect(r.b).toBe(levelUpBonus(l));
        expect(levelForXp(xpForLevel(l))).toBe(l);
        if (l > 1) expect(levelForXp(xpForLevel(l) - 1)).toBe(l - 1);
      }
    });
  });

  describe("new users", () => {
    it("get a profile and an equipped starter room", async () => {
      const uid = await createUser();
      const p = await profile(uid);
      expect(p).toMatchObject({ xp: 0, level: 1, acorns: 0 });
      const slots = await asUser<{ slot: string; item_id: string }>(uid, `select slot, item_id from public.room_slots order by slot`);
      expect(slots.map((s) => s.slot).sort()).toEqual(["bed", "floor", "wallpaper", "window"]);
    });
  });

  describe("row level security", () => {
    let a: string;
    let b: string;
    beforeEach(async () => {
      a = await createUser();
      b = await createUser();
      await onboard(a);
      await onboard(b);
      await rpc(a, "get_today_quests");
      await rpc(b, "get_today_quests");
    });

    it("users only see their own rows", async () => {
      const profiles = await asUser<{ id: string }>(a, `select id from public.profiles`);
      expect(profiles.map((p) => p.id)).toEqual([a]);
      const quests = await asUser<{ user_id: string }>(a, `select user_id from public.daily_quests`);
      expect(quests.length).toBe(3);
      expect(new Set(quests.map((q) => q.user_id))).toEqual(new Set([a]));
      const inv = await asUser<{ user_id: string }>(a, `select user_id from public.inventory`);
      expect(inv.every((r) => r.user_id === a)).toBe(true);
    });

    it("anonymous visitors see the catalog but no user data", async () => {
      expect((await asUser(null, `select * from public.profiles`)).length).toBe(0);
      expect((await asUser(null, `select * from public.daily_quests`)).length).toBe(0);
      expect((await asUser(null, `select * from public.shop_items`)).length).toBeGreaterThan(20);
    });

    it("clients cannot write balances or ledger rows directly", async () => {
      await expect(asUser(a, `update public.profiles set acorns = 99999 where id = $1`, [a])).rejects.toThrow(/permission denied/);
      await expect(
        asUser(a, `insert into public.reward_events (user_id, kind, ref, acorn_delta) values ($1, 'quest', 'x', 500)`, [a]),
      ).rejects.toThrow(/permission denied/);
      await expect(asUser(a, `update public.daily_quests set completed_at = now()`)).rejects.toThrow(/permission denied/);
      await expect(asUser(a, `insert into public.inventory (user_id, item_id) values ($1, 'bonsai')`, [a])).rejects.toThrow(/permission denied/);
      await expect(asUser(a, `select * from public.waitlist`)).rejects.toThrow(/permission denied/);
    });

    it("clients cannot call internal or server-only functions", async () => {
      await expect(asUser(a, `select public._award_achievements($1)`, [a])).rejects.toThrow(/permission denied/);
      await expect(asUser(a, `select public.waitlist_join('x@y.com','h',null,null,null)`)).rejects.toThrow(/permission denied/);
      await expect(asUser(a, `select public.hit_rate_limit('x', 1, 60)`)).rejects.toThrow(/permission denied/);
      await expect(asUser(null, `select public.get_today_quests()`)).rejects.toThrow(/permission denied/);
    });

    it("a user cannot complete someone else's quest", async () => {
      const [bq] = await admin<{ id: string }>(`select id from public.daily_quests where user_id = $1 limit 1`, [b]);
      await expect(rpc(a, "complete_quest", [bq.id])).rejects.toThrow(/quest_not_found/);
      expect((await profile(b)).xp).toBe(0);
    });
  });

  describe("onboarding", () => {
    it("validates input", async () => {
      const uid = await createUser();
      await expect(rpc(uid, "save_profile", ["", ["fitness"], "morning", "small", "UTC", true])).rejects.toThrow(/invalid_display_name/);
      await expect(rpc(uid, "save_profile", ["Sam", [], "morning", "small", "UTC", true])).rejects.toThrow(/invalid_goals/);
      await expect(rpc(uid, "save_profile", ["Sam", ["hacking"], "morning", "small", "UTC", true])).rejects.toThrow(/invalid_goals/);
      await expect(rpc(uid, "save_profile", ["Sam", ["fitness"], "noon", "small", "UTC", true])).rejects.toThrow(/invalid_energy_time/);
      await expect(rpc(uid, "save_profile", ["Sam", ["fitness"], "morning", "small", "Mars/Olympus", true])).rejects.toThrow(/invalid_timezone/);
      await onboard(uid, ["kindness", "money"], "America/New_York");
      const [p] = await admin<{ goals: string[]; onboarded_at: Date; timezone: string }>(`select * from public.profiles where id = $1`, [uid]);
      expect(p.goals).toEqual(["kindness", "money"]);
      expect(p.timezone).toBe("America/New_York");
      expect(p.onboarded_at).toBeTruthy();
    });

    it("limits timezone changes to once a day after onboarding", async () => {
      const uid = await createUser();
      await onboard(uid, ["fitness"], "UTC");
      await rpc(uid, "save_profile", ["Sam", ["fitness"], "morning", "small", "Asia/Tokyo", false]);
      await expect(rpc(uid, "save_profile", ["Sam", ["fitness"], "morning", "small", "Europe/Paris", false])).rejects.toThrow(
        /timezone_change_too_soon/,
      );
      // Other settings still save without changing timezone.
      await rpc(uid, "save_profile", ["Samantha", ["fitness", "study"], "evening", "tiny", "Asia/Tokyo", false]);
    });
  });

  describe("daily quests", () => {
    it("creates three distinct quests once per day, matching goals", async () => {
      const uid = await createUser();
      await onboard(uid, ["money"]);
      const first = await rpc<QuestDay>(uid, "get_today_quests");
      const again = await rpc<QuestDay>(uid, "get_today_quests");
      expect(first.quests).toHaveLength(3);
      expect(again.quests.map((q) => q.id)).toEqual(first.quests.map((q) => q.id));
      expect(new Set(first.quests.map((q) => q.templateId)).size).toBe(3);
      // Two goal quests (money has plenty of templates) + one explore quest.
      expect(first.quests.filter((q) => q.category === "money").length).toBe(2);
      expect(first.quests[2].category).not.toBe("money");
    });

    it("respects tiny steps", async () => {
      const uid = await createUser();
      await onboard(uid, ["study"], "UTC", "tiny");
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      const [{ max }] = await admin<{ max: number }>(
        `select max(t.minutes) as max from public.daily_quests q join public.quest_templates t on t.id = q.template_id where q.user_id = $1`,
        [uid],
      );
      expect(day.quests).toHaveLength(3);
      expect(max).toBeLessThanOrEqual(5);
    });

    it("two tabs opening at once still create one set", async () => {
      const uid = await createUser();
      await onboard(uid);
      const results = await Promise.all(Array.from({ length: 5 }, () => rpc<QuestDay>(uid, "get_today_quests")));
      const ids = new Set(results.flatMap((r) => r.quests.map((q) => q.id)));
      expect(ids.size).toBe(3);
    });

    it("uses the user's timezone for the quest day", async () => {
      const uid = await createUser();
      await onboard(uid, ["fitness"], "Pacific/Kiritimati"); // UTC+14
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      const [{ d }] = await admin<{ d: string }>(`select to_char((now() at time zone 'Pacific/Kiritimati')::date, 'YYYY-MM-DD') as d`);
      expect(day.date).toBe(d);
    });

    it("gives a fresh set the next day without repeating yesterday", async () => {
      const uid = await createUser();
      await onboard(uid, ["fitness"]);
      const day1 = await rpc<QuestDay>(uid, "get_today_quests");
      await shiftDaysBack(uid);
      const day2 = await rpc<QuestDay>(uid, "get_today_quests");
      expect(day2.quests).toHaveLength(3);
      const yesterday = new Set(day1.quests.map((q) => q.templateId));
      expect(day2.quests.some((q) => yesterday.has(q.templateId))).toBe(false);
    });
  });

  describe("rewards", () => {
    it("grants XP and acorns exactly once", async () => {
      const uid = await createUser();
      await onboard(uid);
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      const q = day.quests[0];

      const r1 = await rpc(uid, "complete_quest", [q.id]);
      expect(r1).toMatchObject({ status: "completed", xpGained: q.xp, acornsGained: q.acorns });
      const after1 = await profile(uid);

      const r2 = await rpc(uid, "complete_quest", [q.id]);
      expect(r2).toMatchObject({ status: "already_completed", xpGained: 0, acornsGained: 0 });
      const after2 = await profile(uid);
      expect(after2).toEqual(after1);
      expect(after1.xp).toBe(q.xp);
      expect(after1.quests_completed).toBe(1);
      // first-win achievement (+10 acorns)
      expect(after1.acorns).toBe(q.acorns + 10);
      expect((r1.achievements as Json[]).map((a) => a.id)).toContain("first-win");
    });

    it("is safe under concurrent double-taps", async () => {
      const uid = await createUser();
      await onboard(uid);
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      const q = day.quests[1];
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => rpc(uid, "complete_quest", [q.id])));
      const completed = results.filter((r) => r.status === "fulfilled" && r.value.status === "completed");
      expect(completed).toHaveLength(1);
      const p = await profile(uid);
      expect(p.xp).toBe(q.xp);
      const [{ n }] = await admin<{ n: string }>(`select count(*) as n from public.reward_events where user_id = $1 and kind = 'quest'`, [uid]);
      expect(Number(n)).toBe(1);
    });

    it("ledger always matches balances", async () => {
      const uid = await createUser();
      await onboard(uid);
      for (const q of (await rpc<QuestDay>(uid, "get_today_quests")).quests) await rpc(uid, "complete_quest", [q.id]);
      const [l] = await admin<{ xp: string; acorns: string }>(
        `select sum(xp_delta) as xp, sum(acorn_delta) as acorns from public.reward_events where user_id = $1`,
        [uid],
      );
      const p = await profile(uid);
      expect(Number(l.xp)).toBe(p.xp);
      expect(Number(l.acorns)).toBe(p.acorns);
    });

    it("levels up with a one-time bonus and keeps streaks gentle", async () => {
      const uid = await createUser();
      await onboard(uid);
      let lastLevel = 1;
      let leveled = false;
      for (let d = 0; d < 4; d++) {
        const day = await rpc<QuestDay>(uid, "get_today_quests");
        for (const q of day.quests) {
          const r = await rpc(uid, "complete_quest", [q.id]);
          if (r.leveledUp) {
            leveled = true;
            expect(r.level as number).toBeGreaterThan(lastLevel);
          }
          lastLevel = r.level as number;
        }
        await shiftDaysBack(uid);
      }
      expect(leveled).toBe(true);
      const p = await profile(uid);
      expect(p.level).toBe(levelForXp(p.xp));
      expect(p.days_active).toBe(4);
      expect(p.current_streak).toBe(4);
      const [{ n }] = await admin<{ n: string }>(`select count(*) as n from public.reward_events where user_id = $1 and kind = 'level_up'`, [uid]);
      expect(Number(n)).toBe(p.level - 1);

      // Skip two days: streak restarts at 1, nothing else is taken away.
      await shiftDaysBack(uid, 2);
      const before = await profile(uid);
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      await rpc(uid, "complete_quest", [day.quests[0].id]);
      const after = await profile(uid);
      expect(after.current_streak).toBe(1);
      expect(after.xp).toBeGreaterThan(before.xp);
      expect(after.acorns).toBeGreaterThanOrEqual(before.acorns);
    });

    it("reports history per day and per goal", async () => {
      const uid = await createUser();
      await onboard(uid);
      const day1 = await rpc<QuestDay>(uid, "get_today_quests");
      await rpc(uid, "complete_quest", [day1.quests[0].id]);
      await rpc(uid, "complete_quest", [day1.quests[1].id]);
      await shiftDaysBack(uid);
      const day2 = await rpc<QuestDay>(uid, "get_today_quests");
      await rpc(uid, "complete_quest", [day2.quests[0].id]);
      const h = await rpc<{ byDay: { date: string; completed: number }[]; byCategory: Record<string, number> }>(uid, "get_quest_history", [7]);
      expect(h.byDay).toHaveLength(7);
      expect(h.byDay[6]).toMatchObject({ date: day2.date, completed: 1 });
      expect(h.byDay[5].completed).toBe(2);
      expect(Object.values(h.byCategory).reduce((a, b) => a + b, 0)).toBe(3);
    });

    it("old quests cannot be completed after the day ends", async () => {
      const uid = await createUser();
      await onboard(uid);
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      await shiftDaysBack(uid);
      await rpc(uid, "get_today_quests");
      await expect(rpc(uid, "complete_quest", [day.quests[0].id])).rejects.toThrow(/quest_expired/);
    });

    it("lets you swap one unfinished quest per day", async () => {
      const uid = await createUser();
      await onboard(uid);
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      expect(day.swapAvailable).toBe(true);
      const swapped = await rpc<{ quests: Quest[] }>(uid, "swap_quest", [day.quests[0].id]);
      expect(swapped.quests[0].id).toBe(day.quests[0].id);
      expect(swapped.quests[0].templateId).not.toBe(day.quests[0].templateId);
      expect(new Set(swapped.quests.map((q) => q.templateId)).size).toBe(3);
      await expect(rpc(uid, "swap_quest", [day.quests[1].id])).rejects.toThrow(/swap_used/);
      expect((await rpc<QuestDay>(uid, "get_today_quests")).swapAvailable).toBe(false);
    });
  });

  describe("shop and room", () => {
    async function richUser(acorns: number, level = 1) {
      const uid = await createUser();
      await onboard(uid);
      await admin(`update public.profiles set acorns = $2, level = $3, xp = public.xp_for_level($3) where id = $1`, [uid, acorns, level]);
      return uid;
    }

    it("rejects purchases you cannot afford or have not unlocked", async () => {
      const poor = await richUser(5);
      await expect(rpc(poor, "purchase_item", ["fern"])).rejects.toThrow(/not_enough_acorns/);
      const lowLevel = await richUser(1000, 1);
      await expect(rpc(lowLevel, "purchase_item", ["bonsai"])).rejects.toThrow(/level_too_low/);
      await expect(rpc(lowLevel, "purchase_item", ["golden-throne"])).rejects.toThrow(/item_not_found/);
      expect((await profile(lowLevel)).acorns).toBe(1000);
    });

    it("buys once, deducts acorns, auto-places in empty spots", async () => {
      const uid = await richUser(100);
      const r = await rpc(uid, "purchase_item", ["fern"]);
      expect(r).toMatchObject({ ok: true, equipped: true });
      // 100 - 35 + 10 (Home Sweet Home achievement)
      expect((await profile(uid)).acorns).toBe(75);
      await expect(rpc(uid, "purchase_item", ["fern"])).rejects.toThrow(/already_owned/);
      const slots = await asUser<{ slot: string; item_id: string }>(uid, `select slot, item_id from public.room_slots where slot = 'plant_left'`);
      expect(slots[0].item_id).toBe("fern");
    });

    it("concurrent purchases cannot overspend", async () => {
      const uid = await richUser(50);
      const results = await Promise.allSettled([
        rpc(uid, "purchase_item", ["fern"]), // 35
        rpc(uid, "purchase_item", ["stump-desk"]), // 40
        rpc(uid, "purchase_item", ["plank-shelf"]), // 30
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const p = await profile(uid);
      expect(p.acorns).toBeGreaterThanOrEqual(0);
    });

    it("only equips owned items, into the right slot", async () => {
      const uid = await richUser(200, 2);
      await expect(rpc(uid, "equip_item", ["quilt-bed"])).rejects.toThrow(/not_owned/);
      await rpc(uid, "purchase_item", ["quilt-bed"]);
      // Bed slot was occupied by the starter bed, so not auto-equipped.
      let bed = await asUser<{ item_id: string }>(uid, `select item_id from public.room_slots where slot = 'bed'`);
      expect(bed[0].item_id).toBe("leaf-bed");
      await rpc(uid, "equip_item", ["quilt-bed"]);
      bed = await asUser<{ item_id: string }>(uid, `select item_id from public.room_slots where slot = 'bed'`);
      expect(bed[0].item_id).toBe("quilt-bed");
      await rpc(uid, "unequip_slot", ["bed"]);
      bed = await asUser<{ item_id: string }>(uid, `select item_id from public.room_slots where slot = 'bed'`);
      expect(bed).toHaveLength(0);
    });
  });

  describe("waitlist", () => {
    it("handles new, duplicate, confirmation and position", async () => {
      const join = (email: string, hash: string) =>
        asService<{ r: Json }>(`select public.waitlist_join($1, $2, 'tiktok', null, 'iphash') as r`, [email, hash]).then((r) => r[0].r);

      expect(await join("Fan@Example.com", "h1")).toEqual({ state: "created", should_send: true });
      // Duplicate within 2 minutes: no resend.
      expect(await join("fan@example.com", "h2")).toEqual({ state: "pending", should_send: false });

      const confirm = (hash: string) =>
        asService<{ r: Json }>(`select public.waitlist_confirm($1) as r`, [hash]).then((r) => r[0].r);
      expect(await confirm("nope")).toEqual({ ok: false, reason: "invalid" });
      const c1 = await confirm("h1");
      expect(c1.ok).toBe(true);
      expect(c1.position).toBeGreaterThanOrEqual(1);
      // Confirming twice is fine and keeps the same position.
      expect(await confirm("h1")).toEqual(c1);

      expect(await join("fan@example.com", "h3")).toEqual({ state: "confirmed", should_send: false });
      const rows = await admin<{ email: string }>(`select email from public.waitlist where email like 'fan@%'`);
      expect(rows).toHaveLength(1);
    });

    it("resends after the cooldown and expires old links", async () => {
      const join = (hash: string) =>
        asService<{ r: Json }>(`select public.waitlist_join('slow@example.com', $1, null, null, null) as r`, [hash]).then((r) => r[0].r);
      await join("s1");
      await admin(`update public.waitlist set confirmation_sent_at = now() - interval '5 minutes' where email = 'slow@example.com'`);
      expect(await join("s2")).toEqual({ state: "pending", should_send: true });
      await admin(`update public.waitlist set token_expires_at = now() - interval '1 minute' where email = 'slow@example.com'`);
      const [r] = await asService<{ r: Json }>(`select public.waitlist_confirm('s2') as r`);
      expect(r.r).toEqual({ ok: false, reason: "expired" });
    });

    it("lets people leave with their email token", async () => {
      await asService(`select public.waitlist_join('bye@example.com', 'bye-token', null, null, null)`);
      const [r] = await asService<{ r: Json }>(`select public.waitlist_leave('bye-token') as r`);
      expect(r.r).toEqual({ ok: true });
      const rows = await admin(`select 1 from public.waitlist where email = 'bye@example.com'`);
      expect(rows).toHaveLength(0);
      const [again] = await asService<{ r: Json }>(`select public.waitlist_leave('bye-token') as r`);
      expect(again.r).toEqual({ ok: false });
    });

    it("rate limits per bucket", async () => {
      const hit = () => asService<{ r: boolean }>(`select public.hit_rate_limit('ip:test', 3, 3600) as r`).then((r) => r[0].r);
      const results = [await hit(), await hit(), await hit(), await hit()];
      expect(results).toEqual([true, true, true, false]);
    });
  });

  describe("account deletion", () => {
    it("deleting the auth user removes all of their data", async () => {
      const uid = await createUser();
      await onboard(uid);
      const day = await rpc<QuestDay>(uid, "get_today_quests");
      await rpc(uid, "complete_quest", [day.quests[0].id]);
      await admin(`delete from auth.users where id = $1`, [uid]);
      for (const t of ["profiles", "daily_quests", "reward_events", "inventory", "room_slots", "user_achievements"]) {
        const col = t === "profiles" ? "id" : "user_id";
        const [{ n }] = await admin<{ n: string }>(`select count(*) as n from public.${t} where ${col} = $1`, [uid]);
        expect(Number(n), t).toBe(0);
      }
    });
  });
});
