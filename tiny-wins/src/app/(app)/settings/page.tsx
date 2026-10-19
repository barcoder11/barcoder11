import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { AccountSettings } from "@/components/settings/account-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile, requireUser } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" />
      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">Appearance</h2>
        <AppearanceSettings />
      </Card>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <SettingsContent />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
      </p>
    </div>
  );
}

async function SettingsContent() {
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);
  return (
    <>
      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">Profile</h2>
        <ProfileSettings profile={profile} />
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">Account</h2>
        <AccountSettings email={user.email ?? ""} />
      </Card>
    </>
  );
}
