"use client";

import { Home, ListChecks, ShoppingBag, TreePine, Trophy } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/quests", label: "Quests", icon: ListChecks },
  { href: "/treehouse", label: "Treehouse", icon: TreePine },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/progress", label: "Progress", icon: Trophy },
] as const;

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(`${href}/`);
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/90 px-2 pt-1.5 backdrop-blur-lg safe-bottom md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.7rem] font-bold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-2 inset-y-0 -z-10 rounded-2xl bg-sage dark:bg-secondary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={cn("size-6", active && "stroke-[2.4]")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-base font-semibold transition-colors",
              active ? "bg-sage text-forest-deep shadow-soft dark:bg-secondary dark:text-sage" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
