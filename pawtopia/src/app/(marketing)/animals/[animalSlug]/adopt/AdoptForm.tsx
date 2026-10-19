"use client";
import { useActionState } from "react";
import { adoptAction, type AdoptState } from "./actions";
import { Button, Input, Label, Notice } from "@/components/ui";

export function AdoptForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState<AdoptState, FormData>(adoptAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <Label htmlFor="nickname">Give your {name} a nickname (optional)</Label>
        <Input id="nickname" name="nickname" maxLength={30} placeholder={name} autoComplete="off" />
        <p className="mt-1 text-xs text-ink-soft">Only you will see it. Everyone else still knows them as {name}.</p>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" size="lg" disabled={pending} data-testid="confirm-adopt">
        {pending ? "Preparing a cozy corner…" : `🐾 Adopt ${name}`}
      </Button>
    </form>
  );
}
