"use client";
import { ErrorState } from "@/components/ErrorState";

// Keeps the game header and navigation visible when a game page fails.
export default function GameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} compact />;
}
