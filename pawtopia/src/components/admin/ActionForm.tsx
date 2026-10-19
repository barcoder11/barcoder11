"use client";
import { useActionState, type ReactNode } from "react";
import { Button, Notice } from "@/components/ui";

type State = { ok?: boolean; error?: string; message?: string };

/** Wraps a server action form with pending + result messages. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
  submitVariant = "primary",
}: {
  action: (prev: State, form: FormData) => Promise<State>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  submitVariant?: "primary" | "honey" | "light" | "danger";
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, {});
  return (
    <form action={formAction} className={`grid gap-4 ${className}`}>
      {children}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <div>
        <Button type="submit" disabled={pending} variant={submitVariant}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Small button that runs a server action and shows any returned error. */
export function ActionButton({
  action,
  label,
  variant = "light",
  confirm,
}: {
  action: () => Promise<{ error?: string } | void>;
  label: string;
  variant?: "primary" | "honey" | "light" | "danger";
  confirm?: string;
}) {
  const [state, run, pending] = useActionState<{ error?: string }, FormData>(async () => (await action()) ?? {}, {});
  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-grid gap-1"
    >
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? "…" : label}
      </Button>
      {state.error && <span className="text-xs font-bold text-terracotta">{state.error}</span>}
    </form>
  );
}
