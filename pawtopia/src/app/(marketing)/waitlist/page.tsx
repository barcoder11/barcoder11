import type { Metadata } from "next";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { ButtonLink, Card, FictionDisclosure } from "@/components/ui";
import { getLaunchSettings } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Join the waitlist" };

export default async function WaitlistPage() {
  const launch = await getLaunchSettings();
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Card className="p-7">
        <h1 className="font-display text-3xl font-bold">Join the Pawtopia waitlist</h1>
        {launch.mode === "open" ? (
          <div className="mt-4 grid gap-4">
            <p className="text-ink-soft">Good news — the sanctuary is open right now! You can start playing straight away.</p>
            <ButtonLink href="/auth">Start playing</ButtonLink>
            <p className="text-sm text-ink-soft">Prefer news only? You can still join the list below.</p>
            <WaitlistForm context="waitlist_page" />
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <p className="text-ink-soft">
              The sanctuary isn&apos;t open yet. Leave your email and we&apos;ll send an invite as soon as you can adopt.
              The waitlist is separate from game accounts, and we only keep what we need.
            </p>
            <WaitlistForm context="waitlist_page" />
          </div>
        )}
        <FictionDisclosure className="mt-6" compact />
      </Card>
    </div>
  );
}
