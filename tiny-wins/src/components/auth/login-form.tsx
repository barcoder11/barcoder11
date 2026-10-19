"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { resendConfirmationAction, signInAction, type FormState } from "@/lib/actions/auth";
import { FormAlert, FormField } from "./form-field";

const LINK_ERRORS: Record<string, string> = {
  link_expired: "That link has expired. Log in to get a new one, or reset your password.",
  link_invalid: "That link didn't work. It may have already been used.",
  not_configured: "Accounts aren't connected yet.",
};

export function LoginForm({ next, linkError }: { next?: string; linkError?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, null);
  const [resendState, resend, resending] = useActionState<FormState, FormData>(resendConfirmationAction, null);

  return (
    <div className="flex flex-col gap-4">
      {linkError && LINK_ERRORS[linkError] && <FormAlert>{LINK_ERRORS[linkError]}</FormAlert>}
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <FormField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={state?.fieldErrors?.email} />
        <FormField label="Password" name="password" type="password" autoComplete="current-password" required error={state?.fieldErrors?.password} />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        {state?.error && <FormAlert>{state.error}</FormAlert>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Opening the treehouse…" : "Log in"}
        </Button>
      </form>
      {state?.unconfirmedEmail && (
        <form action={resend} className="flex flex-col gap-2">
          <input type="hidden" name="email" value={state.unconfirmedEmail} />
          <Button type="submit" variant="outline" disabled={resending}>
            {resending ? "Sending…" : "Resend confirmation email"}
          </Button>
          {resendState?.message && <FormAlert kind="info">{resendState.message}</FormAlert>}
          {resendState?.error && <FormAlert>{resendState.error}</FormAlert>}
        </form>
      )}
    </div>
  );
}
