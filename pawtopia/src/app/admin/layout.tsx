import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui";
import { getIsAdmin, requireEditor } from "@/lib/auth";

export const metadata = { title: "Creator admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireEditor("/admin");
  const isAdmin = await getIsAdmin();
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="text-lg" />
            <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-extrabold uppercase text-cream">
              Admin
            </span>
          </Link>
          <Link href="/app" className="text-sm font-bold text-forest hover:underline">
            Back to game →
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <AdminNav isAdmin={isAdmin} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
