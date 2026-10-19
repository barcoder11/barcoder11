"use client";
import { useActionState } from "react";
import { sendCode, verifyCode, type AuthState } from "./actions";
import { Button, Input, Label, Notice } from "@/components/ui";

export function AuthForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, setState] = useActionState<AuthState, FormData>(
    async (prev, form) => (form.get("intent") === "verify" ? verifyCode(prev, form) : sendCode(prev, form)),
    { step: "email", next, error: initialError },
  );

  if (state.step === "code") {
    return (
      <div className="grid gap-4">
        <Notice tone="success">
          📬 {state.info ?? "Check your email."} Sent to <strong>{state.email}</strong>.
        </Notice>
        <p className="text-sm text-ink-soft">
          Tap the link in the email, or type the code below — handy if the email opened in a different app or device.
        </p>
        <form action={setState} className="grid gap-3">
          <input type="hidden" name="intent" value="verify" />
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={12}
            required
            placeholder="123456"
            className="text-center font-display text-2xl tracking-[0.4em]"
          />
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <Button type="submit">Enter Pawtopia</Button>
        </form>
        <form action={setState} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <input type="hidden" name="intent" value="send" />
          <input type="hidden" name="email" value={state.email} />
          <input type="hidden" name="next" value={state.next} />
          <button type="submit" className="font-bold text-forest hover:underline">Send a new code</button>
          <a href={`/auth?next=${encodeURIComponent(state.next)}`} className="font-bold text-ink-soft hover:underline">
            Use a different email
          </a>
        </form>
      </div>
    );
  }

  return (
    <form action={setState} className="grid gap-3">
      <input type="hidden" name="intent" value="send" />
      <input type="hidden" name="next" value={state.next} />
      <Label htmlFor="email">Email address</Label>
      <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" defaultValue={state.email} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit">Email me a sign-in code</Button>
      <p className="text-xs text-ink-soft">No password needed. New here? This creates your free account.</p>
    </form>
  );
}
