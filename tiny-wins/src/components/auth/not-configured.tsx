import { isSupabaseConfigured } from "@/lib/env";

export function NotConfiguredNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="rounded-2xl border-2 border-dashed border-honey-deep/60 bg-honey/30 p-4 text-sm dark:bg-accent/30">
      <p className="font-bold">Accounts aren&apos;t connected yet</p>
      <p className="mt-1 text-muted-foreground">
        Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment to enable
        sign-up and login. See the README.
      </p>
    </div>
  );
}
