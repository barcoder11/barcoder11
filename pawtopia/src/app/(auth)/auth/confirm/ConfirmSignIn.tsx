"use client";
import Link from "next/link";
import { useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Button, buttonClass, Notice } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth-errors";
import { getBrowserClient } from "@/lib/supabase/client";

export function ConfirmSignIn({ tokenHash, type }: { tokenHash: string; type: EmailOtpType }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await getBrowserClient().auth.verifyOtp({ token_hash: tokenHash, type });
      if (verifyError) {
        setError(authErrorMessage(verifyError, "link"));
        setPending(false);
        return;
      }
      window.location.replace("/auth/finish");
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mt-2 font-display text-3xl font-bold">Ready to enter Pawtopia?</h1>
      <p className="mt-2 text-ink-soft">Tap below to finish signing in on this device.</p>
      {error ? (
        <div className="mt-6 grid gap-3">
          <Notice tone="error">{error}</Notice>
          <Link href="/auth" className={buttonClass("primary", "md")}>Get a new code</Link>
        </div>
      ) : (
        <Button size="lg" className="mt-6 w-full" onClick={confirm} disabled={pending} autoFocus data-testid="confirm-sign-in">
          {pending ? "Signing you in…" : "🐾 Sign in to Pawtopia"}
        </Button>
      )}
    </>
  );
}
