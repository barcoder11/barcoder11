"use client";
import { useState, type FormEvent } from "react";
import { prepareSignIn } from "./actions";
import { Button, Input, Label, Notice } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth-errors";
import { getBrowserClient } from "@/lib/supabase/client";

type Step = "email" | "code";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Passwordless sign-in. Requests and verifications go from the browser straight
 * to Supabase (rate limits apply per player); afterwards /auth/finish records
 * attribution and routes the player on the server.
 */
export function AuthForm({
  next,
  initialError,
  siteOrigin,
  firstTouch,
}: {
  next: string;
  initialError?: string;
  siteOrigin: string;
  firstTouch: string | null;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [returnTo, setReturnTo] = useState(next);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(targetEmail: string) {
    const normalized = targetEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
      setError("Please enter a valid email address.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const prepared = await prepareSignIn(next);
      setReturnTo(prepared.next);
      const { error: otpError } = await getBrowserClient().auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(prepared.next)}`,
          // Saved on brand-new accounts so a link opened on another device still
          // returns to the right animal and keeps the video attribution.
          data: { pt_next: prepared.next, pt_ft: firstTouch },
        },
      });
      if (otpError) {
        setError(authErrorMessage(otpError, "email"));
        return;
      }
      setEmail(normalized);
      setStep("code");
      setInfo("We sent a sign-in link and a 6-digit code to your email.");
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6 || token.length > 10) {
      setError("Enter the code from your email.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await getBrowserClient().auth.verifyOtp({ email, token, type: "email" });
      if (verifyError) {
        setError(authErrorMessage(verifyError, "code"));
        setPending(false);
        return;
      }
      // Full navigation so the server sees the new session cookies.
      window.location.replace(`/auth/finish?next=${encodeURIComponent(returnTo)}`);
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
      setPending(false);
    }
  }

  if (step === "code") {
    return (
      <div className="grid gap-4">
        <Notice tone="success">
          📬 {info} Sent to <strong>{email}</strong>.
        </Notice>
        <p className="text-sm text-ink-soft">
          Tap the link in the email, or type the code below — handy if the email opened in a different app or device.
        </p>
        <form onSubmit={verifyCode} className="grid gap-3" noValidate>
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={12}
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center font-display text-2xl tracking-[0.4em]"
            autoFocus
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Enter Pawtopia"}
          </Button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            className="font-bold text-forest hover:underline disabled:opacity-50"
            disabled={pending}
            onClick={() => sendCode(email)}
          >
            Send a new code
          </button>
          <button
            type="button"
            className="font-bold text-ink-soft hover:underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void sendCode(email);
      }}
    >
      <Label htmlFor="email">Email address</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in code"}
      </Button>
      <p className="text-xs text-ink-soft">No password needed. New here? This creates your free account.</p>
    </form>
  );
}
