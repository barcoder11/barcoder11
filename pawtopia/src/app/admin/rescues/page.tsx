import Link from "next/link";
import { StatusBadge } from "@/components/admin/fields";
import { ButtonLink, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; slug: string; title: string; status: string; season: number | null; episode: number | null; animals: { name: string } | null };

export default async function AdminRescues() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rescue_stories")
    .select("id, slug, title, status, season, episode, animals(name)")
    .order("created_at", { ascending: false });
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Rescue episodes</h1>
        <ButtonLink href="/admin/rescues/new" size="sm">+ New episode</ButtonLink>
      </div>
      <div className="grid gap-3">
        {((data ?? []) as unknown as Row[]).map((r) => (
          <Link key={r.id} href={`/admin/rescues/${r.id}`}>
            <Card className="flex items-center justify-between gap-3 p-4 hover:bg-cream-200">
              <div>
                <p className="font-display text-lg font-bold">{r.title}</p>
                <p className="text-sm text-ink-soft">/r/{r.slug} · {r.animals?.name} {r.season ? `· S${r.season}` : ""}{r.episode ? `E${r.episode}` : ""}</p>
              </div>
              <StatusBadge status={r.status} />
            </Card>
          </Link>
        ))}
        {(data ?? []).length === 0 && <p className="text-ink-soft">No episodes yet.</p>}
      </div>
    </div>
  );
}
