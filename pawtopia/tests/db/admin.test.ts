import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  anonClient,
  createUser,
  dbTestsEnabled,
  pool,
  serviceClient,
  setLaunchMode,
  type TestUser,
} from "./helpers";

const storageEnabled = process.env.PAWTOPIA_STORAGE_TESTS === "1";
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

describe.skipIf(!dbTestsEnabled)("admin protection", () => {
  let player: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    await setLaunchMode("open");
    player = await createUser();
    admin = await createUser({ admin: true });
  });

  it("players cannot grant themselves admin", async () => {
    const r = await player.db.from("app_roles").insert({ user_id: player.id, role: "admin" });
    expect(r.error).not.toBeNull();
    const { data } = await player.db.rpc("is_admin");
    expect(data).toBe(false);
  });

  it("players cannot call admin functions or write content", async () => {
    expect((await player.db.rpc("admin_overview")).error).not.toBeNull();
    expect((await player.db.rpc("admin_funnel", {})).error).not.toBeNull();
    const ins = await player.db.from("animals").insert({ slug: "evil", name: "Evil", species: "x" });
    expect(ins.error).not.toBeNull();
    const upd = await player.db.from("app_settings").update({ value: { mode: "waitlist" } }).eq("key", "launch").select();
    expect(upd.data ?? []).toHaveLength(0);
    const { data: waitlist } = await player.db.from("waitlist_entries").select("*");
    expect(waitlist ?? []).toHaveLength(0);
  });

  it("admin creates a new animal + rescue without code, previews the draft, and publishes", async () => {
    const slug = `fern-${crypto.randomUUID().slice(0, 6)}`;
    const { data: animal, error } = await admin.db
      .from("animals")
      .insert({
        slug, name: "Fern", species: "Hedgehog", placeholder_style: "generic",
        habitat_slug: "forest-glade", bio: "A prickly but gentle hedgehog.", status: "draft",
      })
      .select()
      .single();
    expect(error).toBeNull();
    const { data: rescue, error: rErr } = await admin.db
      .from("rescue_stories")
      .insert({ slug: `${slug}-hedge-rescue`, animal_id: animal!.id, title: "Fern and the Hedge", status: "draft" })
      .select()
      .single();
    expect(rErr).toBeNull();

    // Visitors cannot see the draft; the admin can (preview).
    const { data: anonView } = await anonClient().from("animals").select("id").eq("slug", slug);
    expect(anonView).toHaveLength(0);
    const { data: adminView } = await admin.db.from("animals").select("id").eq("slug", slug);
    expect(adminView).toHaveLength(1);

    // The disclosure cannot be turned off.
    const off = await admin.db.from("rescue_stories").update({ ai_fiction_disclosure: false }).eq("id", rescue!.id);
    expect(off.error).not.toBeNull();

    const { data: pub } = await admin.db.rpc("admin_publish_rescue", { p_rescue_id: rescue!.id });
    expect(pub.status).toBe("published");
    const { data: live } = await anonClient().from("rescue_stories").select("slug, animals(status)").eq("id", rescue!.id).single();
    expect((live!.animals as any).status).toBe("published");

    // A player adopts Fern; archiving later keeps the adoption and the player's view.
    const { data: adopted } = await player.db.rpc("adopt_animal", { p_animal_slug: slug, p_nickname: "Spike" });
    expect(adopted.status).toBe("adopted");
    expect((await admin.db.from("animals").update({ status: "archived" }).eq("id", animal!.id)).error).toBeNull();
    const { data: playerView } = await player.db.from("animals").select("slug").eq("slug", slug);
    expect(playerView).toHaveLength(1);
    const { data: stranger } = await anonClient().from("animals").select("slug").eq("slug", slug);
    expect(stranger).toHaveLength(0);
    const { rows } = await pool.query(`select count(*)::int n from public.user_animals where id = $1`, [adopted.user_animal_id]);
    expect(rows[0].n).toBe(1);
    // Animals with adoptions can't be deleted.
    const del = await admin.db.from("animals").delete().eq("id", animal!.id).select();
    expect(del.data ?? []).toHaveLength(0);

    // Audit trail captured the admin's changes.
    const { data: audit } = await admin.db.from("admin_audit_logs").select("action, entity_type").eq("entity_id", animal!.id);
    expect(audit!.length).toBeGreaterThanOrEqual(2);
  });

  it("admin sees aggregate funnel numbers only", async () => {
    const { data, error } = await admin.db.rpc("admin_funnel", {});
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    for (const row of data) {
      expect(Object.keys(row)).not.toContain("user_id");
      expect(Object.keys(row)).not.toContain("email");
    }
    const { data: overview } = await admin.db.rpc("admin_overview");
    expect(overview.adoptions).toBeGreaterThan(0);
  });
});

describe.skipIf(!dbTestsEnabled)("waitlist", () => {
  it("is only writable by the server (service role)", async () => {
    const r = await anonClient().rpc("waitlist_upsert", {
      p_email: "x@example.test", p_token_hash: "a", p_unsubscribe_hash: "b", p_opt_in: false, p_source: {}, p_client_key: "k",
    });
    expect(r.error).not.toBeNull();
  });

  it("stores an email once, stays neutral on duplicates, verifies, unsubscribes and deletes", async () => {
    const svc = serviceClient();
    const email = `Wait.${crypto.randomUUID().slice(0, 6)}@Example.test`;
    const tok = crypto.randomUUID();
    const unsub = crypto.randomUUID();
    const first = await svc.rpc("waitlist_upsert", {
      p_email: email, p_token_hash: sha(tok), p_unsubscribe_hash: sha(unsub), p_opt_in: true, p_source: { source: "instagram" },
      p_client_key: `test:${crypto.randomUUID()}`,
    });
    expect(first.data.action).toBe("send");
    // Immediate duplicate (any casing) is rate limited -> skip, no second email.
    const dup = await svc.rpc("waitlist_upsert", {
      p_email: email.toLowerCase(), p_token_hash: sha("other"), p_unsubscribe_hash: sha("other2"), p_opt_in: false, p_source: {},
      p_client_key: `test:${crypto.randomUUID()}`,
    });
    expect(dup.data.action).toBe("skip");
    const { rows } = await pool.query(`select count(*)::int n from public.waitlist_entries where normalized_email = $1`, [email.toLowerCase()]);
    expect(rows[0].n).toBe(1);

    expect((await svc.rpc("waitlist_verify", { p_token_hash: sha("wrong") })).data.status).toBe("invalid");
    expect((await svc.rpc("waitlist_verify", { p_token_hash: sha(tok) })).data.status).toBe("verified");
    expect((await svc.rpc("waitlist_verify", { p_token_hash: sha(tok) })).data.status).toBe("invalid"); // single use

    expect((await svc.rpc("waitlist_unsubscribe", { p_unsubscribe_hash: sha(unsub), p_delete: false })).data.status).toBe("unsubscribed");
    expect((await svc.rpc("waitlist_unsubscribe", { p_unsubscribe_hash: sha(unsub), p_delete: true })).data.status).toBe("deleted");
    const { rows: after } = await pool.query(`select count(*)::int n from public.waitlist_entries where normalized_email = $1`, [email.toLowerCase()]);
    expect(after[0].n).toBe(0);
  });
});

describe.skipIf(!dbTestsEnabled)("admin tools", () => {
  it("exports only consenting contacts, admin-only, and audits every export", async () => {
    const admin = await createUser({ admin: true });
    const player = await createUser();
    const fan = await createUser();
    await fan.db.rpc("update_profile", { p_display_name: "Fan", p_timezone: "UTC", p_marketing_opt_in: true, p_reduced_motion: false });
    const confirmed = `confirmed-${crypto.randomUUID().slice(0, 6)}@example.test`;
    const pending = `pending-${crypto.randomUUID().slice(0, 6)}@example.test`;
    await pool.query(
      `insert into public.waitlist_entries (email, normalized_email, status, verified_at) values ($1, $1, 'verified', now()), ($2, $2, 'pending', null)`,
      [confirmed, pending],
    );

    expect((await player.db.rpc("admin_export_contacts", { p_kind: "waitlist" })).error).not.toBeNull();

    const { data: waitlist, error } = await admin.db.rpc("admin_export_contacts", { p_kind: "waitlist" });
    expect(error).toBeNull();
    const emails = (waitlist as { email: string }[]).map((r) => r.email);
    expect(emails).toContain(confirmed);
    expect(emails).not.toContain(pending);

    const { data: players } = await admin.db.rpc("admin_export_contacts", { p_kind: "players" });
    const playerEmails = (players as { email: string }[]).map((r) => r.email);
    expect(playerEmails).toContain(fan.email);
    expect(playerEmails).not.toContain(player.email);

    const { rows } = await pool.query(
      `select entity_id, diff from public.admin_audit_logs where admin_user_id = $1 and action = 'export' order by created_at`,
      [admin.id],
    );
    expect(rows.map((r) => r.entity_id)).toEqual(["waitlist", "players"]);
    expect(rows[0].diff.rows).toBe(emails.length);
  });

  it("only admins can delete waitlist entries or change decorations", async () => {
    const admin = await createUser({ admin: true });
    const player = await createUser();
    const email = `del-${crypto.randomUUID().slice(0, 6)}@example.test`;
    const { rows } = await pool.query(`insert into public.waitlist_entries (email, normalized_email) values ($1, $1) returning id`, [email]);
    expect((await player.db.rpc("admin_delete_waitlist_entry", { p_id: rows[0].id })).error).not.toBeNull();
    expect((await admin.db.rpc("admin_delete_waitlist_entry", { p_id: rows[0].id })).data.status).toBe("deleted");

    const upd = await player.db.from("decor_catalog").update({ price: 0 }).eq("slug", "lily-pond").select();
    expect(upd.data ?? []).toHaveLength(0);
    const { data: pond } = await anonClient().from("decor_catalog").select("price").eq("slug", "lily-pond").single();
    expect(pond!.price).toBe(80);
  });
});

describe.skipIf(!dbTestsEnabled)("abuse protection and retention", () => {
  it("limits waitlist sign-ups per client", async () => {
    const svc = serviceClient();
    const key = `test:${crypto.randomUUID()}`;
    const actions: string[] = [];
    for (let i = 0; i < 9; i++) {
      const { data } = await svc.rpc("waitlist_upsert", {
        p_email: `flood-${i}-${crypto.randomUUID().slice(0, 6)}@example.test`, p_token_hash: sha(`t${i}`),
        p_unsubscribe_hash: sha(`u${i}`), p_opt_in: false, p_source: {}, p_client_key: key,
      });
      actions.push(data.action);
    }
    expect(actions.slice(0, 8).every((a) => a === "send")).toBe(true);
    expect(actions[8]).toBe("rate_limited");
  });

  it("maintenance purges stale data and is server-only", async () => {
    expect((await anonClient().rpc("run_maintenance")).error).not.toBeNull();
    const oldAnon = crypto.randomUUID();
    const staleEmail = `stale-${crypto.randomUUID().slice(0, 6)}@example.test`;
    await pool.query(
      `insert into public.attribution_events (event_type, anonymous_id, occurred_at) values ('rescue_landing_viewed', $1, now() - interval '200 days')`,
      [oldAnon],
    );
    await pool.query(
      `insert into public.waitlist_entries (email, normalized_email, created_at) values ($1, $1, now() - interval '40 days')`,
      [staleEmail],
    );
    await pool.query(`insert into public.rate_limits (bucket, window_start, hits) values ('test:old', now() - interval '3 days', 1)`);
    const { data, error } = await serviceClient().rpc("run_maintenance");
    expect(error).toBeNull();
    expect(data.old_anonymous_events_deleted).toBeGreaterThanOrEqual(1);
    expect(data.stale_waitlist_deleted).toBeGreaterThanOrEqual(1);
    expect(data.rate_limit_rows_deleted).toBeGreaterThanOrEqual(1);
    const { rows } = await pool.query(`select count(*)::int n from public.attribution_events where anonymous_id = $1`, [oldAnon]);
    expect(rows[0].n).toBe(0);
    const { rows: w } = await pool.query(`select count(*)::int n from public.waitlist_entries where normalized_email = $1`, [staleEmail]);
    expect(w[0].n).toBe(0);
  });
});

describe.skipIf(!dbTestsEnabled || !storageEnabled)("media storage", () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  it("only admins can upload, and unsafe types are rejected", async () => {
    const player = await createUser();
    const admin = await createUser({ admin: true });
    const path = `animals/maple/test-${crypto.randomUUID()}.png`;

    const denied = await player.db.storage.from("pawtopia-media").upload(path, png, { contentType: "image/png" });
    expect(denied.error).not.toBeNull();

    const ok = await admin.db.storage.from("pawtopia-media").upload(path, png, { contentType: "image/png" });
    expect(ok.error).toBeNull();

    const svg = await admin.db.storage
      .from("pawtopia-media")
      .upload(`animals/maple/x-${crypto.randomUUID()}.svg`, Buffer.from("<svg onload=alert(1)>"), { contentType: "image/svg+xml" });
    expect(svg.error).not.toBeNull();

    const outside = await admin.db.storage.from("pawtopia-media").upload(`elsewhere/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
    expect(outside.error).not.toBeNull();

    // Public URL is readable without auth.
    const url = admin.db.storage.from("pawtopia-media").getPublicUrl(path).data.publicUrl;
    const res = await fetch(url);
    expect(res.status).toBe(200);
  });
});

afterAll(async () => {
  await pool.end();
});
