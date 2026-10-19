import type { Metadata } from "next";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { buttonClass, Card } from "@/components/ui";
import { ConfirmSignIn } from "./ConfirmSignIn";

export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false } };

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/**
 * Landing page for the email link. Verification waits for a tap: some email
 * providers pre-open links to scan them, which would otherwise use up the
 * one-time link before the player ever sees it.
 */
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const sp = await searchParams;
  const tokenHash = typeof sp.token_hash === "string" ? sp.token_hash : "";
  const type = typeof sp.type === "string" ? (sp.type as EmailOtpType) : null;
  const valid = /^[A-Za-z0-9_-]{10,200}$/.test(tokenHash) && type !== null && TYPES.includes(type);

  return (
    <Card className="w-full max-w-md p-7 text-center pop-in">
      <div className="text-5xl" aria-hidden="true">
        🦝
      </div>
      {valid ? (
        <ConfirmSignIn tokenHash={tokenHash} type={type!} />
      ) : (
        <>
          <h1 className="mt-2 font-display text-3xl font-bold">This link doesn&apos;t look right</h1>
          <p className="mt-2 text-ink-soft">It may be incomplete. Request a new sign-in code to continue.</p>
          <Link href="/auth" className={buttonClass("primary", "md", "mt-6")}>
            Get a new code
          </Link>
        </>
      )}
    </Card>
  );
}
