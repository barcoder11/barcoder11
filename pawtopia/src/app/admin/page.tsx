import { ActionForm } from "@/components/admin/ActionForm";
import { Field, adminInput } from "@/components/admin/fields";
import { ButtonLink, Card } from "@/components/ui";
import { updateEconomy, updateLaunchSettings } from "./actions";
import { getIsAdmin } from "@/lib/auth";
import { getEconomy, getLaunchSettings } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import { many, one } from "@/lib/data/db";

export default async function AdminOverview() {
  const supabase = await createClient();
  const [overviewResult, launch, economy, isAdmin, animalsResult, auditResult] = await Promise.all([
    supabase.rpc("admin_overview"),
    getLaunchSettings(),
    getEconomy(),
    getIsAdmin(),
    supabase.from("animals").select("slug, name, status").order("sort_order"),
    supabase
      .from("admin_audit_logs")
      .select("id, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const o = one(overviewResult, "admin overview");
  const animals = many(animalsResult, "animals");
  // Audit rows are admin-only (RLS returns none to editors).
  const audit = many(auditResult, "audit log");
  const stats = [
    ["Players", o?.players],
    ["Adoptions", o?.adoptions],
    ["Care actions (24h)", o?.care_24h],
    ["Landing views (7d)", o?.landing_views_7d],
    ["Waitlist verified", o?.waitlist_verified],
    ["Waitlist pending", o?.waitlist_pending],
    ["Published animals", o?.animals_published],
    ["Draft / coming soon", o?.animals_draft],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Creator dashboard</h1>
        <div className="flex gap-2">
          <ButtonLink href="/admin/animals/new" size="sm">
            + New animal
          </ButtonLink>
          <ButtonLink href="/admin/rescues/new" size="sm" variant="honey">
            + New rescue episode
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="font-display text-3xl font-bold">{value ?? 0}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-display text-xl font-bold">Launch mode</h2>
          <p className="mb-4 text-sm text-ink-soft">
            <strong>Waitlist</strong>: public pages + email waitlist, no adoptions. <strong>Open beta</strong>: sign-up
            and adoption are live.
          </p>
          {isAdmin ? (
            <ActionForm action={updateLaunchSettings}>
              <Field label="Mode">
                <select name="mode" defaultValue={launch.mode} className={adminInput}>
                  <option value="waitlist">Waitlist</option>
                  <option value="open">Open beta</option>
                </select>
              </Field>
              <Field label="Featured animal (landing page hero)">
                <select
                  name="featured_animal_slug"
                  defaultValue={launch.featured_animal_slug ?? ""}
                  className={adminInput}
                >
                  <option value="">Automatic</option>
                  {animals.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name} ({a.status})
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          ) : (
            <p className="text-sm">
              Current mode: <strong>{launch.mode}</strong> (admins can change this).
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-xl font-bold">Economy</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Rewards and cooldowns are applied by the server. Edit carefully — validated before saving.
          </p>
          {isAdmin ? (
            <ActionForm action={updateEconomy} submitLabel="Save economy">
              <textarea
                name="economy"
                defaultValue={JSON.stringify(economy, null, 2)}
                className={`${adminInput} min-h-72 font-mono text-xs`}
                spellCheck={false}
                aria-label="Economy JSON"
              />
            </ActionForm>
          ) : (
            <pre className="overflow-auto rounded-xl bg-cream p-3 text-xs">{JSON.stringify(economy, null, 2)}</pre>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Recent admin activity</h2>
        <ul className="grid gap-1 text-sm">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-2 rounded-lg px-2 py-1 odd:bg-cream">
              <span className="font-mono text-xs text-ink-soft">{new Date(a.created_at).toLocaleString()}</span>
              <span className="font-bold">{a.action}</span>
              <span>{a.entity_type}</span>
              <span className="truncate font-mono text-xs text-ink-soft">{a.entity_id}</span>
            </li>
          ))}
          {audit.length === 0 && <li className="text-ink-soft">No changes yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
