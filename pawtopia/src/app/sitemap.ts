import type { MetadataRoute } from "next";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

/** Public pages for search engines: home, legal pages, published rescues and animals. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/waitlist`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
  if (!isSupabaseConfigured()) return pages;
  const supabase = createPublicClient();
  const [{ data: rescues }, { data: animals }] = await Promise.all([
    supabase.from("rescue_stories").select("slug, updated_at").eq("status", "published"),
    supabase.from("animals").select("slug, updated_at").eq("status", "published"),
  ]);
  for (const r of rescues ?? []) {
    pages.push({ url: `${base}/r/${r.slug}`, lastModified: r.updated_at, changeFrequency: "weekly", priority: 0.9 });
  }
  for (const a of animals ?? []) {
    pages.push({
      url: `${base}/animals/${a.slug}`,
      lastModified: a.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  return pages;
}
