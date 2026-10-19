import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 text-sm font-semibold text-muted-foreground md:flex">
          <Link href="/#how" className="rounded-full px-3 py-2 hover:bg-muted hover:text-foreground">How it works</Link>
          <Link href="/#treehouse" className="rounded-full px-3 py-2 hover:bg-muted hover:text-foreground">Treehouse</Link>
          <Link href="/#faq" className="rounded-full px-3 py-2 hover:bg-muted hover:text-foreground">FAQ</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/#join">Join waitlist</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
