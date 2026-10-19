"use client";
import { useActionState } from "react";
import { deleteAccount, saveProfile, type DeleteState, type ProfileState } from "@/app/app/actions";
import { Button, Input, Label, Notice } from "@/components/ui";
import { guardAction, OFFLINE_MESSAGE } from "@/lib/safe-action";

export function ProfileForm(props: { displayName: string; timezone: string; marketing: boolean; reducedMotion: boolean; timezones: string[] }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    guardAction(saveProfile, () => ({ status: "error", message: OFFLINE_MESSAGE })),
    {},
  );
  return (
    <form action={action} className="grid gap-4">
      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={props.displayName} maxLength={40} />
      </div>
      <div>
        <Label htmlFor="timezone">Time zone (daily rewards reset at your local midnight)</Label>
        <select id="timezone" name="timezone" defaultValue={props.timezone} className="block w-full rounded-2xl border-2 border-sage-200 bg-white px-4 py-3">
          {props.timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="reducedMotion" defaultChecked={props.reducedMotion} className="mt-0.5 h-5 w-5 accent-forest" />
        <span><strong>Reduce motion</strong> — calmer animations throughout the game.</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="marketing" defaultChecked={props.marketing} className="mt-0.5 h-5 w-5 accent-forest" />
        <span><strong>New rescue emails</strong> — hear when new animals arrive (optional).</span>
      </label>
      {state.message && <Notice tone={state.status === "ok" ? "success" : "error"}>{state.message}</Notice>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(
    guardAction(deleteAccount, () => ({ error: OFFLINE_MESSAGE })),
    {},
  );
  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm text-ink-soft">
        This permanently deletes your account, animals, progress, acorns and decorations. It can&apos;t be undone.
      </p>
      <Label htmlFor="confirm">Type DELETE to confirm</Label>
      <Input id="confirm" name="confirm" autoComplete="off" />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" variant="danger" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</Button>
    </form>
  );
}
