"use client";

import { KeyRound, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteAccountAction, signOutAction, type FormState } from "@/lib/actions/auth";

export function AccountSettings({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccountAction, null);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-bold break-all">{email}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline">
          <Link href="/reset-password">
            <KeyRound /> Change password
          </Link>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOut /> Log out
          </Button>
        </form>
      </div>

      <div className="mt-2 rounded-2xl border-2 border-destructive/30 p-4">
        <p className="font-bold text-destructive">Delete account</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This permanently deletes your profile, quests, acorns, achievements and treehouse. It can&apos;t be undone.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="mt-3">
              <Trash2 /> Delete my account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>Pip will miss you. Everything will be permanently erased. Type DELETE to confirm.</DialogDescription>
            </DialogHeader>
            <form action={action} className="flex flex-col gap-4">
              <FormField label="Type DELETE" name="confirm" autoComplete="off" autoCapitalize="characters" error={state?.fieldErrors?.confirm} />
              {state?.error && <FormAlert>{state.error}</FormAlert>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Keep my account
                </Button>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? "Deleting…" : "Delete forever"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
