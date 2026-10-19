import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";
import type { Database } from "@/lib/database";
import { isSupabaseConfigured } from "@/lib/env";
import { log } from "@/lib/log";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

// Signed-in visitors read the catalog live through their session, so RLS decides
// what they see (editors also see drafts). Anonymous visitors, who are almost all
// of the traffic from the videos, all see the same public catalog, so their reads
// are shared across requests and keyed by public.catalog_version, which database
// triggers bump on every content change. A cached page therefore costs one tiny
// query and is never stale, even after edits made directly in the database.

type Db = SupabaseClient<Database>;

/**
 * Current catalog version: one single-row read per request. Null if it can't be
 * read (e.g. a database missing the catalog_version migration): pages are then
 * served uncached instead of failing.
 */
const catalogVersion = cache(async (): Promise<number | null> => {
  const { data, error } = await createPublicClient().from("catalog_version").select("version").maybeSingle();
  if (error) {
    log.warn("catalog version unavailable; serving public pages uncached", { code: error.code });
    return null;
  }
  return data?.version ?? 0;
});

/**
 * A catalog query that anonymous visitors share (cached per catalog version and
 * arguments) while signed-in visitors run it live with their own session.
 * `empty` is returned before Supabase is configured (the app shows its setup
 * notice then, but layouts and metadata still render on the server).
 */
export function catalogRead<Args extends unknown[], Result>(
  name: string,
  empty: Result,
  query: (db: Db, ...args: Args) => Promise<Result>,
) {
  const shared = unstable_cache(
    (_version: number, ...args: Args) => query(createPublicClient(), ...args),
    ["catalog", name],
    { revalidate: 3600 }, // safety net only: a new version already means a new cache key
  );
  return cache(async (...args: Args): Promise<Result> => {
    if (!isSupabaseConfigured()) return empty;
    if (await getSessionUser()) return query(await createClient(), ...args);
    const version = await catalogVersion();
    return version === null ? query(createPublicClient(), ...args) : shared(version, ...args);
  });
}
