import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordEvent } from "@/lib/analytics";

const utmValue = z.string().max(100).nullable().optional();
const schema = z.object({
  event: z.enum(["rescue_landing_viewed", "animal_page_viewed", "adoption_cta_clicked", "signup_started"]),
  rescue_slug: z.string().max(80).nullable().optional(),
  animal_slug: z.string().max(60).nullable().optional(),
  utm: z.object({ source: utmValue, medium: utmValue, campaign: utmValue, content: utmValue }).partial().optional(),
});

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ ok: false }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const ok = await recordEvent({
    event: parsed.data.event,
    rescueSlug: parsed.data.rescue_slug,
    animalSlug: parsed.data.animal_slug,
    utm: parsed.data.utm,
  });
  return NextResponse.json({ ok }, { headers: { "Cache-Control": "no-store" } });
}
