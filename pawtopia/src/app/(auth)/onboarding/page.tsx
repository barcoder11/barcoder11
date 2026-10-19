import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { sanitizeNext } from "@/lib/safe-redirect";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const next = sanitizeNext(typeof sp.next === "string" ? sp.next : null, "/app");
  await requireUser(`/onboarding?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  if (profile?.onboarding_completed_at) redirect(next);

  return (
    <Card className="w-full max-w-md p-7 pop-in">
      <div className="mb-5 text-center">
        <div className="text-5xl" aria-hidden="true">
          🌿
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Let&apos;s set up your sanctuary</h1>
        <p className="mt-1 text-ink-soft">Just a couple of quick things — it takes 10 seconds.</p>
      </div>
      <OnboardingForm next={next} />
    </Card>
  );
}
