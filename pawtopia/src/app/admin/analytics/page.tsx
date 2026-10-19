import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/time";

type FunnelRow = {
  rescue_title: string | null;
  source: string;
  landing_views: number;
  cta_clicks: number;
  signups: number;
  adoptions: number;
  first_cares: number;
  return_d1: number;
  return_d7: number;
};

const RANGES: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export default async function AdminAnalytics({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin("/admin/analytics");
  const sp = await searchParams;
  const days = RANGES[String(sp.days ?? "30")] ?? 30;
  const since = daysAgoIso(days);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_funnel", { p_since: since });
  const rows = (data ?? []) as FunnelRow[];
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Funnel by episode & source</h1>
        <nav className="flex gap-1 text-sm font-bold">
          {Object.keys(RANGES).map((d) => (
            <a
              key={d}
              href={`?days=${d}`}
              className={`rounded-full px-3 py-1.5 ${Number(d) === days ? "bg-forest text-cream" : "bg-white"}`}
            >
              {d} days
            </a>
          ))}
        </nav>
      </div>
      <p className="text-sm text-ink-soft">
        Counts distinct visitors/players. Aggregates only — no emails or user ids are shown. Sign-ups and later steps
        are attributed to each player&apos;s first-touch rescue link.
      </p>
      {error && <p className="text-terracotta">Couldn&apos;t load analytics.</p>}
      <Card className="overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Funnel by episode and source">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sage text-xs uppercase tracking-wide text-forest-700">
            <tr>
              <th className="p-3">Episode</th>
              <th>Source</th>
              <th>Visitors</th>
              <th>CTA</th>
              <th>Sign-ups</th>
              <th>Adoptions</th>
              <th>First care</th>
              <th>D1</th>
              <th>D7</th>
              <th>Visit→Adopt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-ink/5">
                <td className="p-3 font-bold">
                  {r.rescue_title ?? <span className="text-ink-soft">(no episode)</span>}
                </td>
                <td>{r.source}</td>
                <td>{r.landing_views}</td>
                <td>{r.cta_clicks}</td>
                <td>{r.signups}</td>
                <td>{r.adoptions}</td>
                <td>{r.first_cares}</td>
                <td>{r.return_d1}</td>
                <td>{r.return_d7}</td>
                <td>{pct(Number(r.adoptions), Number(r.landing_views))}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-ink-soft">
                  No events in this period yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
