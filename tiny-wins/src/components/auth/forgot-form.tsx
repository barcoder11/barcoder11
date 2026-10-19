"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { forgotPasswordAction, type FormState } from "@/lib/actions/auth";
import { FormAlert, FormField } from "./form-field";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, null);
  if (state?.message) return <FormAlert kind="info">{state.message}</FormAlert>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={state?.fieldErrors?.email} />
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
