"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app/sanctuary", label: "Sanctuary", icon: "🏡" },
  { href: "/app", label: "Animals", icon: "🐾" },
  { href: "/app/stories", label: "Stories", icon: "📖" },
  { href: "/app/shop", label: "Shop", icon: "🛍️" },
  { href: "/app/profile", label: "Profile", icon: "🙂" },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/app/animals");
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Game"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold ${active ? "text-forest" : "text-ink-soft"}`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full text-xl transition ${active ? "bg-sage" : ""}`} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ isEditor }: { isEditor: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Game" className="sticky top-20 hidden w-56 shrink-0 md:block">
      <ul className="grid gap-1">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-lg font-semibold transition ${active ? "bg-forest text-cream shadow-soft" : "text-ink hover:bg-sage"}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
        {isEditor && (
          <li className="mt-4">
            <Link href="/admin" className="flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-terracotta hover:bg-sage">
              <span aria-hidden="true">🛠️</span> Creator admin
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
