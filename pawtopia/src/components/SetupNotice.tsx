import { Logo } from "@/components/ui";

/** Shown instead of the app when Supabase environment variables are missing. */
export function SetupNotice() {
  return (
    <main className="bg-paper flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-lg rounded-[2rem] bg-white p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-bold">Almost there — connect Supabase</h1>
        <p className="mt-3 text-ink-soft">
          Pawtopia needs a Supabase project to run. Copy <code className="rounded bg-sage px-1">.env.example</code> to{" "}
          <code className="rounded bg-sage px-1">.env.local</code>, fill in <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart. See the README for the full setup.
        </p>
      </div>
    </main>
  );
}
