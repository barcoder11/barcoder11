"use client";
import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";
import { Button, Input, Label, Notice } from "@/components/ui";
import { guardAction, OFFLINE_MESSAGE } from "@/lib/safe-action";

const subscribe = () => () => {};
const getTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function OnboardingForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    guardAction(completeOnboarding, () => ({ error: OFFLINE_MESSAGE })),
    {},
  );
  const timezone = useSyncExternalStore(subscribe, getTimezone, () => "UTC");

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="timezone" value={timezone} />
      <div>
        <Label htmlFor="displayName">What should your animals call you? (optional)</Label>
        <Input id="displayName" name="displayName" maxLength={40} placeholder="e.g. Sam" autoComplete="nickname" />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Favourite kind of place? (optional)</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["forest", "🌲", "Forest"],
            ["river", "🏞️", "River"],
            ["snow", "❄️", "Snowy"],
          ].map(([value, icon, label]) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-sage-200 bg-white p-3 font-bold has-[:checked]:border-forest has-[:checked]:bg-sage"
            >
              <input type="radio" name="habitat" value={value} className="sr-only" />
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 rounded-2xl bg-cream-200/60 p-4 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 accent-forest" />
          <span>
            I agree to the <Link href="/terms" target="_blank" className="font-bold text-forest underline">Terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="font-bold text-forest underline">Privacy Policy</Link>, and I understand
            Pawtopia is a fictional game with virtual-only adoptions.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="age" required className="mt-0.5 h-5 w-5 accent-forest" />
          <span>I am 13 years old or older.</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="marketing" className="mt-0.5 h-5 w-5 accent-forest" />
          <span>Email me when new rescue animals arrive (optional).</span>
        </label>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
