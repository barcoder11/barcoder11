import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "export_failed" }, { status: 500 });
  return new NextResponse(JSON.stringify({ email: user.email, ...data }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="pawtopia-data.json"`,
      "cache-control": "private, no-store",
    },
  });
}
