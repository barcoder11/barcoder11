"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TikTokIcon } from "@/components/brand/icons";
import { Pip } from "@/components/pip/pip";
import { Button } from "@/components/ui/button";
import { confirmWaitlistAction, type ConfirmState } from "@/lib/actions/waitlist";
import { SITE_URL, TIKTOK_URL } from "@/lib/env";
import { ShareButton } from "./share-button";

export function ConfirmCard({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmWaitlistAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <Pip pose="cheer" size={170} />
        <h1 className="text-4xl font-bold text-forest-deep dark:text-sage">You&apos;re in! 🎉</h1>
        {state.position > 0 && (
          <p className="rounded-full bg-honey/60 px-4 py-1.5 font-display text-lg font-bold text-bark-deep dark:bg-accent dark:text-honey">
            Treehouse spot #{state.position.toLocaleString()}
          </p>
        )}
        <p className="max-w-sm text-muted-foreground">
          Your spot is confirmed. Pip will email you the moment the treehouse doors open. Until then, catch his latest adventures on TikTok.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="honey">
            <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer">
              <TikTokIcon /> Follow Pip
            </a>
          </Button>
          <ShareButton url={SITE_URL} text="I just joined Pip's treehouse on Tiny Wins 🌰 Big dreams. Small steps." />
        </div>
      </div>
    );
  }

  const message =
    state?.ok === false
      ? state.reason === "expired"
        ? "This link has expired. Join again from the home page and we'll send a fresh one."
        : state.reason === "invalid"
          ? "We couldn't find that confirmation link. It may have been replaced by a newer email."
          : "The waitlist is taking a nap. Please try again in a moment."
      : null;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Pip pose="wave" size={150} />
      <h1 className="text-3xl font-bold">One tap to confirm</h1>
      <p className="max-w-sm text-muted-foreground">Confirm your email to lock in your early-access spot in Pip&apos;s treehouse.</p>
      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <Button size="lg" type="submit" disabled={pending || !token}>
          {pending ? "Confirming…" : "Confirm my spot"}
        </Button>
      </form>
      {message && (
        <p role="alert" className="max-w-sm text-sm font-semibold text-destructive">
          {message}{" "}
          <Link href="/#join" className="underline">
            Back to sign-up
          </Link>
        </p>
      )}
    </div>
  );
}
