import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  return (
    <>
      <AuthHeading title="Check your email" pose="happy" />
      <div className="flex flex-col gap-4 text-muted-foreground">
        <p>
          We sent a confirmation link to{" "}
          <Suspense fallback={<span>your inbox</span>}>
            <EmailFromParams searchParams={searchParams} />
          </Suspense>
          . Tap it to verify your email and meet your Pip.
        </p>
        <p className="text-sm">Can&apos;t find it? Check spam or promotions. Links expire after 24 hours.</p>
        <Button asChild variant="outline">
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    </>
  );
}

async function EmailFromParams({ searchParams }: { searchParams: PageProps<"/check-email">["searchParams"] }) {
  const { email } = await searchParams;
  return <strong className="text-foreground">{typeof email === "string" ? email : "your inbox"}</strong>;
}
