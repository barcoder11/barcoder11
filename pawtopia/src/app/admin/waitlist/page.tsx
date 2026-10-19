import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionForm";
import { adminInput } from "@/components/admin/fields";
import { buttonClass, Card } from "@/components/ui";
import { deleteWaitlistEntry } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { many } from "@/lib/data/db";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

type Entry = {
  id: string;
  email: string;
  status: string;
  promotional_opt_in: boolean;
  created_at: string;
  verified_at: string | null;
};

export default async function AdminWaitlist({ searchParams }: PageProps<"/admin/waitlist">) {
  await requireAdmin("/admin/waitlist");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("waitlist_entries")
    .select("id, email, status, promotional_opt_in, created_at, verified_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  // Escape LIKE wildcards so the search is literal.
  if (q) query = query.ilike("normalized_email", `%${q.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  const result = await query;
  const entries = many<Entry>(result, "waitlist");
  const total = result.count ?? entries.length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Waitlist</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {total} {q ? "matching" : "total"} sign-ups. Unconfirmed sign-ups are removed automatically after 30 days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* File downloads from route handlers, not page navigations — plain anchors are correct here. */}
          <a href="/admin/export/waitlist" download className={buttonClass("light", "sm")}>
            ⬇ Confirmed waitlist (CSV)
          </a>
          <a href="/admin/export/players" download className={buttonClass("light", "sm")}>
            ⬇ Players who want news (CSV)
          </a>
        </div>
      </div>
      <p className="rounded-2xl bg-honey/20 px-4 py-3 text-sm">
        Exports contain only people who asked to hear from Pawtopia and are recorded in the audit log. Import them into
        an email tool that adds an unsubscribe link to every message.
      </p>

      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search by email
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by email" className={adminInput} />
        <button className={buttonClass("primary", "sm", "h-auto")} type="submit">
          Search
        </button>
      </form>

      <Card className="overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Waitlist sign-ups">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sage text-xs uppercase tracking-wide text-forest-700">
            <tr>
              <th className="p-3">Email</th>
              <th>Status</th>
              <th>News opt-in</th>
              <th>Joined</th>
              <th className="sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-ink/5">
                <td className="p-3 font-semibold">{e.email}</td>
                <td>{e.status}</td>
                <td>{e.promotional_opt_in ? "yes" : "no"}</td>
                <td>{new Date(e.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  <ActionButton
                    action={deleteWaitlistEntry.bind(null, e.id)}
                    label="Delete"
                    variant="danger"
                    confirm={`Delete ${e.email} from the waitlist?`}
                  />
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-ink-soft">
                  No sign-ups{q ? " match that search" : " yet"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <nav className="flex justify-between text-sm font-bold" aria-label="Pages">
        {page > 1 ? (
          <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`} className="text-forest">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        {page * PAGE_SIZE < total ? (
          <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`} className="text-forest">
            Older →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
