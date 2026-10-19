import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { StatusBadge } from "@/components/admin/fields";
import { LinkGenerator } from "@/components/admin/LinkGenerator";
import { RescueFields } from "@/components/admin/RescueFields";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { publishRescue, setRescueStatus, updateRescue } from "../../actions";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AnimalAsset, RescueStory } from "@/lib/types";
import { many, one } from "@/lib/data/db";

export default async function EditRescue({ params, searchParams }: PageProps<"/admin/rescues/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const rescue = one<RescueStory>(
    await supabase.from("rescue_stories").select("*").eq("id", id).maybeSingle(),
    "admin rescue",
  );
  if (!rescue) notFound();
  const [animalsResult, assetsResult, funnelResult] = await Promise.all([
    supabase.from("animals").select("id, name, status").order("sort_order"),
    supabase.from("animal_assets").select("*").eq("animal_id", rescue.animal_id),
    supabase.rpc("admin_funnel", { p_since: "2000-01-01T00:00:00Z" }),
  ]);
  const animals = many<{ id: string; name: string; status: string }>(animalsResult, "animals");
  const assets = many<AnimalAsset>(assetsResult, "rescue assets");
  // The funnel is admin-only; editors simply don't see the numbers.
  type FunnelRow = {
    rescue_id: string | null;
    source: string;
    landing_views: number;
    cta_clicks: number;
    signups: number;
    adoptions: number;
    first_cares: number;
  };
  const rows = (funnelResult.error ? [] : ((funnelResult.data ?? []) as FunnelRow[])).filter((r) => r.rescue_id === id);
  const totals = rows.reduce(
    (t, r) => ({
      views: t.views + Number(r.landing_views),
      cta: t.cta + Number(r.cta_clicks),
      signups: t.signups + Number(r.signups),
      adoptions: t.adoptions + Number(r.adoptions),
      cares: t.cares + Number(r.first_cares),
    }),
    { views: 0, cta: 0, signups: 0, adoptions: 0, cares: 0 },
  );

  return (
    <div className="grid gap-6">
      {sp.created === "1" && (
        <Notice tone="success">Draft episode created. Add video links, preview, then publish.</Notice>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{rescue.title}</h1>
          <StatusBadge status={rescue.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/r/${rescue.slug}`} size="sm" variant="light" target="_blank">
            👁 Preview
          </ButtonLink>
          {rescue.status !== "published" && (
            <ActionButton action={publishRescue.bind(null, id)} label="Publish episode + animal" variant="primary" />
          )}
          {rescue.status === "published" && (
            <ActionButton action={setRescueStatus.bind(null, id, "draft")} label="Unpublish" />
          )}
          {rescue.status !== "archived" && (
            <ActionButton
              action={setRescueStatus.bind(null, id, "archived")}
              label="Archive"
              variant="danger"
              confirm="Archive this episode? Its link will show a friendly retired page."
            />
          )}
        </div>
      </div>

      <Card>
        <h2 className="mb-1 font-display text-xl font-bold">Share links</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Paste these into your posts so every visit, sign-up and adoption is attributed to the right video.
        </p>
        <LinkGenerator siteUrl={env.siteUrl} rescueSlug={rescue.slug} published={rescue.status === "published"} />
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Episode funnel (all time)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Landing visitors", totals.views],
            ["CTA clicks", totals.cta],
            ["Sign-ups", totals.signups],
            ["Adoptions", totals.adoptions],
            ["First care", totals.cares],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-cream p-3">
              <p className="text-xs font-extrabold uppercase text-ink-soft">{l}</p>
              <p className="font-display text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
        {rows.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ink-soft">
                <th className="py-1">Source</th>
                <th>Views</th>
                <th>CTA</th>
                <th>Sign-ups</th>
                <th>Adoptions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.source} className="border-t border-ink/5">
                  <td className="py-1 font-bold">{r.source}</td>
                  <td>{r.landing_views}</td>
                  <td>{r.cta_clicks}</td>
                  <td>{r.signups}</td>
                  <td>{r.adoptions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">Episode details</h2>
        <ActionForm action={updateRescue.bind(null, id)}>
          <RescueFields rescue={rescue} animals={animals} assets={assets} />
        </ActionForm>
      </Card>
    </div>
  );
}
