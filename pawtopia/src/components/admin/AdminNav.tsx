"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/animals", label: "Animals" },
  { href: "/admin/rescues", label: "Rescues & links" },
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/analytics", label: "Analytics", adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 no-scrollbar">
      <ul className="flex gap-1">
        {ITEMS.filter((i) => isAdmin || !("adminOnly" in i)).map((i) => {
          const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-forest text-cream" : "text-ink-soft hover:bg-sage"}`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
