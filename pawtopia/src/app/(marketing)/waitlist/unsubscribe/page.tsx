import type { Metadata } from "next";
import { unsubscribeWaitlist } from "../actions";
import { Button, ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Waitlist preferences", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: PageProps<"/waitlist/unsubscribe">) {
  const sp = await searchParams;
  const done = typeof sp.done === "string" ? sp.done : null;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-8">
        {done ? (
          <>
            <h1 className="font-display text-2xl font-bold">
              {done === "deleted" ? "Your email has been removed" : "You're unsubscribed"}
            </h1>
            <p className="mt-2 text-ink-soft">
              {done === "deleted"
                ? "We've deleted your waitlist entry. Thanks for stopping by."
                : "You won't receive any more waitlist emails from us."}
            </p>
            <ButtonLink href="/" className="mt-6">
              Back to Pawtopia
            </ButtonLink>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">Waitlist email preferences</h1>
            <p className="mt-2 text-ink-soft">Choose what you&apos;d like us to do with your email address.</p>
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
