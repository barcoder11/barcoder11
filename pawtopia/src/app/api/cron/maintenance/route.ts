import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * Daily retention job (scheduled in vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET the route refuses.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service_role_not_configured" }, { status: 503 });
  const { data, error } = await admin.rpc("run_maintenance");
  if (error) {
    log.error("maintenance failed", { code: error.code });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  log.info("maintenance completed", data as Record<string, number>);
  return NextResponse.json({ ok: true, ...(data as object) });
}
