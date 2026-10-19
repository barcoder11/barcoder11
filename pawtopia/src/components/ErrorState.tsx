"use client";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui";

/** Friendly error panel used by the route error boundaries. */
export function ErrorState({ error, reset, compact = false }: { error: Error & { digest?: string }; reset: () => void; compact?: boolean }) {
  useEffect(() => {
    // Shows up in the browser console; server-side details are in the Vercel logs under the same digest.
    console.error("Pawtopia error boundary", error.digest ?? error.message);
  }, [error]);
  return (
    <div className={`flex flex-col items-center justify-center gap-4 p-6 text-center ${compact ? "min-h-[50dvh]" : "bg-paper min-h-[60dvh]"}`} role="alert">
      <div className="text-6xl" aria-hidden="true">🌧️</div>
      <h1 className="font-display text-3xl font-bold">A little storm passed through</h1>
      <p className="max-w-md text-ink-soft">Something went wrong loading this page. Your progress is safe — please try again.</p>
      {error.digest && <p className="text-xs text-ink-soft">Reference: {error.digest}</p>}
      <button onClick={reset} className={buttonClass("primary", "md")}>
        Try again
      </button>
    </div>
  );
}
