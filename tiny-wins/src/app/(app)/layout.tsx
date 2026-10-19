import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { BottomNav, SideNav } from "@/components/app/app-nav";
import { CelebrationProvider } from "@/components/app/celebration";
import { HeaderStats, HeaderStatsSkeleton } from "@/components/app/header-stats";
import { SettingsButton } from "@/components/app/user-menu";
import { Logo } from "@/components/brand/logo";
import { Pip } from "@/components/pip/pip";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CelebrationProvider>
      <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border/70 bg-card/60 p-5 md:flex">
          <Logo href="/home" />
          <SideNav />
          <div className="mt-auto flex flex-col items-center gap-3 rounded-3xl bg-sage/60 p-4 text-center dark:bg-secondary/50">
            <Pip pose="idle" size={90} />
            <p className="text-sm font-semibold text-forest-deep dark:text-sage">Big dreams. Small steps.</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start text-muted-foreground">
              <LogOut /> Log out
            </Button>
          </form>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4">
              <div className="md:hidden">
                <Logo href="/home" className="[&>span:last-child]:hidden min-[380px]:[&>span:last-child]:inline" />
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Suspense fallback={<HeaderStatsSkeleton />}>
                  <HeaderStats />
                </Suspense>
                <ThemeToggle className="hidden sm:inline-flex" />
                <SettingsButton />
              </div>
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-28 md:pb-12">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </CelebrationProvider>
  );
}
