"use client";

import { Pip } from "@/components/pip/pip";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center" role="alert">
      <Pip pose="sleepy" size={140} />
      <h1 className="text-3xl font-bold">Something got tangled in the branches</h1>
      <p className="max-w-sm text-muted-foreground">Your progress is safe. Let&apos;s try that again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
