import { Logo } from "@/components/brand/logo";
import { Pip } from "@/components/pip/pip";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-sage via-[#cfe3d3] to-honey/70 lg:flex lg:flex-col lg:items-center lg:justify-center dark:from-secondary dark:via-[#1d332d] dark:to-accent/40">
        <div aria-hidden className="absolute -bottom-32 -left-20 size-96 rounded-full bg-forest/20 blur-3xl" />
        <Pip pose="wave" size={300} priority />
        <p className="mt-6 max-w-sm text-center font-display text-3xl font-bold text-forest-deep dark:text-sage">
          Big dreams. Small steps. One acorn at a time.
        </p>
      </aside>
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
