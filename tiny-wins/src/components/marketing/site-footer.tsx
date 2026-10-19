import Link from "next/link";
import { TikTokIcon } from "@/components/brand/icons";
import { Logo } from "@/components/brand/logo";
import { CONTACT_EMAIL, TIKTOK_URL } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Big dreams. Small steps. One acorn at a time.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm font-semibold sm:grid-cols-3">
          <Link href="/#join" className="hover:text-primary">Early access</Link>
          <Link href="/login" className="hover:text-primary">Log in</Link>
          <Link href="/signup" className="hover:text-primary">Create account</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          <Link href="/terms" className="hover:text-primary">Terms</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary">Contact</a>
          <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
            <TikTokIcon className="size-4" /> TikTok
          </a>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">© Tiny Wins. Pip and the Tiny Wins name are trademarks of their creator.</p>
    </footer>
  );
}
