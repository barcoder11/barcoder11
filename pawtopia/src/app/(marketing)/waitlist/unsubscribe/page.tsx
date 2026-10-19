import type { Metadata } from "next";
import { unsubscribeWaitlist } from "../actions";
import { Button, ButtonLink, Card, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Waitlist preferences", robots: { index: false } };

// Outcomes reported by unsubscribeWaitlist (only what actually happened).
const OUTCOMES: Record<string, { title: string; body: string }> = {
  unsubscribed: {
    title: "You're unsubscribed",
    body: "You won't receive any more waitlist emails from us.",
  },
  deleted: {
    title: "Your email has been removed",
    body: "We've deleted your waitlist entry. Thanks for stopping by.",
  },
  invalid: {
    title: "That link didn't work",
    body: "It may have been used already. If you removed your email before, there's nothing more to do.",
  },
};

export default async function UnsubscribePage({ searchParams }: PageProps<"/waitlist/unsubscribe">) {
  const sp = await searchParams;
  const done = typeof sp.done === "string" ? sp.done : null;
  const token = typeof sp.token === "string" ? sp.token : "";
  const outcome = done ? OUTCOMES[done] : undefined;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-8">
        {outcome ? (
          <>
            <h1 className="font-display text-2xl font-bold">{outcome.title}</h1>
            <p className="mt-2 text-ink-soft">{outcome.body}</p>
            <ButtonLink href="/" className="mt-6">
              Back to Pawtopia
            </ButtonLink>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">Waitlist email preferences</h1>
            <p className="mt-2 text-ink-soft">Choose what you&apos;d like us to do with your email address.</p>
            {done === "error" && (
              <Notice tone="error" className="mt-4">
                Something went wrong and nothing was changed. Please try again.
              </Notice>
            )}
            <form action={unsubscribeWaitlist} className="mt-6 grid gap-3">
              <input type="hidden" name="token" value={token} />
              <Button type="submit" name="delete" value="0" variant="light">
                Unsubscribe from emails
              </Button>
              <Button type="submit" name="delete" value="1" variant="danger">
                Delete my waitlist entry entirely
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
