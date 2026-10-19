import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Waitlist" };

const COPY: Record<string, { title: string; body: string }> = {
  verified: { title: "You're on the list! 🎉", body: "Your email is confirmed. We'll let you know the moment the sanctuary opens." },
  expired: { title: "That link has expired", body: "No problem — just sign up again and we'll send a fresh confirmation link." },
  invalid: { title: "That link didn't work", body: "It may have been used already. If you still need to confirm, sign up again for a new link." },
};

export default async function WaitlistConfirmedPage({ searchParams }: PageProps<"/waitlist/confirmed">) {
  const status = String((await searchParams).status ?? "invalid");
  const copy = COPY[status] ?? COPY.invalid;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-8 text-center">
        <div className="text-5xl" aria-hidden="true">{status === "verified" ? "💌" : "🍂"}</div>
        <h1 className="mt-3 font-display text-3xl font-bold">{copy.title}</h1>
        <p className="mt-2 text-ink-soft">{copy.body}</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/">Back to Pawtopia</ButtonLink>
          {status !== "verified" && <ButtonLink href="/waitlist" variant="light">Join again</ButtonLink>}
        </div>
      </Card>
    </div>
  );
}
