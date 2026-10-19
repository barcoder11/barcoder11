import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ANON_COOKIE, isUuid } from "@/lib/attribution";

const schema = z.object({
  event: z.enum(["rescue_landing_viewed", "animal_page_viewed", "adoption_cta_clicked", "signup_started"]),
  rescue_slug: z.string().max(80).nullable().optional(),
  animal_slug: z.string().max(60).nullable().optional(),
  utm: z
    .object({
      source: z.string().max(100).nullable().optional(),
      medium: z.string().max(100).nullable().optional(),
      campaign: z.string().max(100).nullable().optional(),
      content: z.string().max(100).nullable().optional(),
    })
    .partial()
    .optional(),
});

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ ok: false }, { status: 413 });
  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const anon = request.cookies.get(ANON_COOKIE)?.value;
  const supabase = await createClient();
  const { error } = await supabase.rpc("track_event", {
    p_event_type: parsed.data.event,
    p_anonymous_id: isUuid(anon) ? anon : null,
    p_rescue_slug: parsed.data.rescue_slug ?? null,
    p_animal_slug: parsed.data.animal_slug ?? null,
    p_attribution: parsed.data.utm ?? {},
  });
  return NextResponse.json({ ok: !error }, { headers: { "Cache-Control": "no-store" } });
}
