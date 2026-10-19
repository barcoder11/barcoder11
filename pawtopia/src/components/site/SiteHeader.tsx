import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ButtonLink, Logo } from "@/components/ui";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Pawtopia home">
          <Logo className="text-xl sm:text-2xl" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/#rescues"
            className="hidden rounded-full px-3 py-2 font-bold text-ink-soft hover:bg-sage sm:inline-flex"
          >
            Rescues
          </Link>
          <Link
            href="/#how"
            className="hidden rounded-full px-3 py-2 font-bold text-ink-soft hover:bg-sage sm:inline-flex"
          >
            How it works
          </Link>
          {user ? (
            <ButtonLink href="/app" size="sm" prefetch={false}>
              My sanctuary
            </ButtonLink>
          ) : (
            <ButtonLink href="/auth" size="sm" variant="light">
              Sign in
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink/5 bg-sage/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div>
          <Logo className="text-xl" />
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Every rescue deserves a new beginning. Pawtopia is a fictional game inspired by AI-generated rescue stories.
            No real animals are rescued or adopted, virtual acorns have no cash value, and nothing in the game is a
            donation or wildlife care advice. Designed for ages 13+.
          </p>
        </div>
        <nav className="flex flex-wrap items-start gap-4 text-sm font-bold text-forest">
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <Link href="/waitlist" className="hover:underline">
            Waitlist
          </Link>
          <Link href="/auth" className="hover:underline">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
