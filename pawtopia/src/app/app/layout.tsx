import Link from "next/link";
import { AcornCounter, GameStateProvider, MotionPreference } from "@/components/game/GameState";
import { BottomNav, SideNav } from "@/components/game/GameNav";
import { Logo } from "@/components/ui";
import { getIsEditor, requirePlayer } from "@/lib/auth";
import { getWallet } from "@/lib/data/player";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false } };

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePlayer("/app");
  const supabase = await createClient();
  // Server-side return-visit tracking (D1/D7).
  await supabase.rpc("touch_activity");
  const [balance, isEditor] = await Promise.all([getWallet(), getIsEditor()]);

  return (
    <GameStateProvider initialBalance={balance}>
      <MotionPreference reduced={profile.reduced_motion} />
      <div className="bg-paper min-h-dvh pb-24 md:pb-8">
        <header className="sticky top-0 z-30 border-b border-ink/5 bg-cream/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/app" aria-label="Pawtopia home">
              <Logo className="text-xl" />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/app/shop" aria-label="Open shop">
                <AcornCounter />
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto flex max-w-6xl gap-6 px-4 pt-4 md:pt-6">
          <SideNav isEditor={isEditor} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        <BottomNav />
      </div>
    </GameStateProvider>
  );
}
