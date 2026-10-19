import Link from "next/link";
import { cn } from "@/lib/utils";
import { AcornIcon } from "./icons";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 rounded-full", className)} aria-label="Tiny Wins home">
      <span className="grid size-9 place-items-center rounded-2xl bg-sage shadow-soft transition-transform group-hover:-rotate-6 dark:bg-secondary">
        <AcornIcon className="size-6" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-forest-deep dark:text-sage">
        Tiny&nbsp;Wins
      </span>
    </Link>
  );
}
