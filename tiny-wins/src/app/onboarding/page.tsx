import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Pip } from "@/components/pip/pip";
import { getProfile, requireUser } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default function OnboardingPage() {
  return (
    <main id="main" className="min-h-dvh bg-gradient-to-b from-sage/70 to-background dark:from-secondary/40">
      <Suspense
        fallback={
          <div className="grid min-h-dvh place-items-center">
            <Pip pose="wave" size={140} />
          </div>
        }
      >
        <Onboarding />
      </Suspense>
    </main>
  );
}

async function Onboarding() {
  const user = await requireUser();
  const profile = await getProfile();
  if (profile.onboarded_at) redirect("/home");
  const suggested = profile.display_name ?? user.email?.split("@")[0]?.replace(/[^\p{L}\p{N} ]/gu, " ").slice(0, 40).trim() ?? "";
  return <OnboardingFlow suggestedName={suggested} />;
}
