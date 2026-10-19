"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signUpAction, type FormState } from "@/lib/actions/auth";
import { FormAlert, FormField } from "./form-field";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={state?.fieldErrors?.email} />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters, with a letter and a number."
        error={state?.fieldErrors?.password}
      />
      <label className="flex items-start gap-3 rounded-2xl bg-muted/70 p-3 text-sm">
        <input type="checkbox" name="agree" className="mt-0.5 size-5 shrink-0 accent-[var(--forest)]" required />
        <span>
          I&apos;m 13 or older and I agree to the{" "}
          <Link href="/terms" className="font-semibold text-primary underline" target="_blank">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-primary underline" target="_blank">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {state?.fieldErrors?.agree && <p className="-mt-2 text-sm font-semibold text-destructive">{state.fieldErrors.agree}</p>}
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Building your treehouse…" : "Create my account"}
      </Button>
    </form>
  );
}
