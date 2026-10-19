"use client";
import { buttonClass } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="bg-paper flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl" aria-hidden="true">🌧️</div>
      <h1 className="font-display text-3xl font-bold">A little storm passed through</h1>
      <p className="max-w-md text-ink-soft">Something went wrong loading this page. Your progress is safe — please try again.</p>
      <button onClick={reset} className={buttonClass("primary", "md")}>Try again</button>
    </main>
  );
}
