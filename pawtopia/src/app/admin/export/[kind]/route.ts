import { NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

const KINDS = { waitlist: "pawtopia-waitlist", players: "pawtopia-players-news" } as const;

/** Admin-only CSV export of consenting contacts (see admin_export_contacts). */
export async function GET(_request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!(kind in KINDS) || !(await getIsAdmin())) {
    return new NextResponse("Not found", { status: 404 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_export_contacts", { p_kind: kind });
  if (error) {
    log.error("contact export failed", { kind, code: error.code });
    return new NextResponse("Export failed", { status: 500 });
  }
  const rows = (data ?? []) as { email: string; opted_in_to_news: boolean; since: string }[];
  const csv = toCsv(["email", "opted_in_to_news", "since"], rows.map((r) => [r.email, r.opted_in_to_news, r.since]));
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${KINDS[kind as keyof typeof KINDS]}-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
