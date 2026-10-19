import "server-only";
import { cookies } from "next/headers";
import { ANON_COOKIE, isUuid } from "@/lib/attribution";
import { getSessionUser } from "@/lib/auth";
import { log } from "@/lib/log";
import { clientKey } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";

type ClientEvent = "rescue_landing_viewed" | "animal_page_viewed" | "adoption_cta_clicked" | "signup_started";

/**
 * Records a client-reported funnel event for the current visitor. Writes go
 * through the service role (the public API can't insert events) and are rate
 * limited per client in SQL; duplicates per visitor/page/day are ignored.
 */
export async function recordEvent(input: {
  event: ClientEvent;
  rescueSlug?: string | null;
  animalSlug?: string | null;
  utm?: Record<string, string | null | undefined>;
}) {
  const admin = createAdminClient();
  if (!admin) return false;
  const anon = (await cookies()).get(ANON_COOKIE)?.value;
  const user = await getSessionUser();
  if (!user && !isUuid(anon)) return false;
  const { data, error } = await admin.rpc("track_event", {
    p_event_type: input.event,
    p_anonymous_id: isUuid(anon) ? anon : null,
    p_user_id: user?.id ?? null,
    p_rescue_slug: input.rescueSlug ?? null,
    p_animal_slug: input.animalSlug ?? null,
    p_attribution: input.utm ?? {},
    p_client_key: await clientKey("track"),
  });
  if (error) log.warn("track_event failed", { event: input.event, code: error.code });
  return data === true;
}
