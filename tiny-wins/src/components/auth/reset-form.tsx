"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updatePasswordAction, type FormState } from "@/lib/actions/auth";
import { FormAlert, FormField } from "./form-field";

export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={state?.fieldErrors?.password}
      />
      <FormField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={state?.fieldErrors?.confirm} />
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
