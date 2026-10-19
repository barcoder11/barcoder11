import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const target = new URL("/waitlist/confirmed", request.url);
  const admin = createAdminClient();
  if (!admin || token.length < 20 || token.length > 100) {
    target.searchParams.set("status", "invalid");
    return NextResponse.redirect(target);
  }
  const { data } = await admin.rpc("waitlist_verify", { p_token_hash: hashToken(token) });
  target.searchParams.set("status", (data?.status as string) ?? "invalid");
  return NextResponse.redirect(target);
}
