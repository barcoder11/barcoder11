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
      p_email: "x@example.test", p_token_hash: "a", p_unsubscribe_hash: "b", p_opt_in: false, p_source: {},
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
    });
    expect(first.data.action).toBe("send");
    // Immediate duplicate (any casing) is rate limited -> skip, no second email.
    const dup = await svc.rpc("waitlist_upsert", {
      p_email: email.toLowerCase(), p_token_hash: sha("other"), p_unsubscribe_hash: sha("other2"), p_opt_in: false, p_source: {},
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
