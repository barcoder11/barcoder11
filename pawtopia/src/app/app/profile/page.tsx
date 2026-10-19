import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getProfile, getSessionUser } from "@/lib/auth";
import { DeleteAccountForm, ProfileForm } from "./ProfileForms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
  const timezones = Intl.supportedValuesOf("timeZone");
  const tz = profile?.timezone ?? "UTC";
  return (
    <div className="grid max-w-2xl gap-5">
      <h1 className="font-display text-3xl font-bold">Profile & settings</h1>
      <Card>
        <p className="text-sm text-ink-soft">Signed in as</p>
        <p className="font-bold">{user?.email}</p>
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">Settings</h2>
        <ProfileForm
          displayName={profile?.display_name ?? ""}
          timezone={tz}
          marketing={profile?.marketing_opt_in ?? false}
          reducedMotion={profile?.reduced_motion ?? false}
          timezones={timezones.includes(tz) ? timezones : [tz, ...timezones]}
        />
      </Card>
      <Card className="grid gap-3">
        <h2 className="font-display text-xl font-bold">Your data</h2>
        <p className="text-sm text-ink-soft">Download everything Pawtopia stores about your account as a JSON file.</p>
        <a href="/app/profile/export" className="font-bold text-forest underline">Download my data</a>
        <form action="/auth/signout" method="post">
          <button type="submit" className="font-bold text-ink-soft underline" data-testid="sign-out">Sign out</button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-xl font-bold text-terracotta">Delete account</h2>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
