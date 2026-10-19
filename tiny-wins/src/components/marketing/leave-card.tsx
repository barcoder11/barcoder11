"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Pip } from "@/components/pip/pip";
import { Button } from "@/components/ui/button";
import { leaveWaitlistAction, type LeaveState } from "@/lib/actions/waitlist";

export function LeaveCard({ token }: { token: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(leaveWaitlistAction, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <Pip pose="sleepy" size={140} />
        <h1 className="text-3xl font-bold">You&apos;ve been removed</h1>
        <p className="max-w-sm text-muted-foreground">We won&apos;t email you again. The treehouse door is always open if you change your mind.</p>
        <Button asChild variant="outline"><Link href="/">Back home</Link></Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Pip pose="idle" size={140} />
      <h1 className="text-3xl font-bold">Leave the waitlist?</h1>
      <p className="max-w-sm text-muted-foreground">We&apos;ll delete your email from the Tiny Wins early-access list.</p>
      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <Button variant="destructive" type="submit" disabled={pending || !token}>
          {pending ? "Removing…" : "Remove my email"}
        </Button>
      </form>
      {state?.ok === false && <p role="alert" className="text-sm font-semibold text-destructive">That link didn&apos;t work. Please email us and we&apos;ll remove you.</p>}
    </div>
  );
}
