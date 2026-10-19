import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { decodeFirstTouch, encodeFirstTouch, FIRST_TOUCH_COOKIE } from "@/lib/attribution";
import { getSessionUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/request";
import { sanitizeNext } from "@/lib/safe-redirect";
import { AuthForm } from "./AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  link_expired: "That sign-in link has expired or was already used. Request a new code below.",
  auth_failed: "We couldn't sign you in with that link. Request a new code below.",
};

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const sp = await searchParams;
  const next = sanitizeNext(typeof sp.next === "string" ? sp.next : null, "/app");
  if (await getSessionUser()) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const adopting = next.match(/^\/animals\/([a-z0-9-]+)\/adopt/);
  // The visitor's own (sanitised) first-touch attribution, saved with a new account.
  const touch = decodeFirstTouch((await cookies()).get(FIRST_TOUCH_COOKIE)?.value);

  return (
    <Card className="w-full max-w-md p-7 pop-in">
      <div className="mb-5 text-center">
        <div className="text-5xl" aria-hidden="true">🦝</div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          {adopting ? "One quick step to adopt" : "Welcome to Pawtopia"}
        </h1>
        <p className="mt-1 text-ink-soft">
          {adopting ? "Sign in with your email so your new friend is saved to your sanctuary." : "Sign in or create your free account."}
        </p>
      </div>
      <AuthForm next={next} initialError={error} siteOrigin={await siteOrigin()} firstTouch={touch ? encodeFirstTouch(touch) : null} />
    </Card>
  );
}
