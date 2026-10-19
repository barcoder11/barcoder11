import Link from "next/link";
import { connection } from "next/server";
import { buttonClass, Logo } from "@/components/ui";

export default async function NotFound() {
  // Render per request so Next.js can apply this request's CSP nonce to its scripts
  // (a build-time 404 page would carry no nonce and its scripts would be blocked).
  await connection();
  return (
    <main className="bg-paper flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <div className="text-6xl" aria-hidden="true">🍂</div>
      <h1 className="font-display text-3xl font-bold">This trail leads nowhere</h1>
      <p className="max-w-md text-ink-soft">We couldn&apos;t find that page. It may have moved, or the rescue episode isn&apos;t published yet.</p>
      <Link href="/" className={buttonClass("primary", "md")}>Back to Pawtopia</Link>
    </main>
  );
}
