"use client";
import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/(marketing)/waitlist/actions";
import { Button, Input, Notice } from "@/components/ui";
import { guardAction, OFFLINE_MESSAGE } from "@/lib/safe-action";

/** `context` records which page the form was on (e.g. "rescue_page") for the funnel. */
export function WaitlistForm({ context }: { context: string }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(
    guardAction(joinWaitlist, () => ({ status: "error", message: OFFLINE_MESSAGE })),
    { status: "idle" },
  );
  if (state.status === "ok") {
    return (
      <Notice tone="success" className="pop-in text-base">
        💌 {state.message}
      </Notice>
    );
  }
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="form" value={context} />
      <label htmlFor="waitlist-email" className="text-sm font-bold">
        Get an invite when the sanctuary opens
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="waitlist-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Saving…" : "Join waitlist"}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="promo" className="mt-1 h-4 w-4 accent-forest" />
        <span>Also send me occasional news about new rescues (optional — unsubscribe anytime).</span>
      </label>
      {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
    </form>
  );
}
