"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type GameState = { balance: number; setBalance: (n: number) => void };
const Ctx = createContext<GameState | null>(null);

/** Client-side mirror of the server balance so the HUD updates instantly after actions. */
export function GameStateProvider({ initialBalance, children }: { initialBalance: number; children: ReactNode }) {
  const [balance, setBalance] = useState(initialBalance);
  const [lastServerBalance, setLastServerBalance] = useState(initialBalance);
  // Re-sync when the server sends a fresh value (e.g. after navigation/refresh).
  if (initialBalance !== lastServerBalance) {
    setLastServerBalance(initialBalance);
    setBalance(initialBalance);
  }
  return <Ctx value={{ balance, setBalance }}>{children}</Ctx>;
}

export function useGameState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGameState outside provider");
  return v;
}

export function AcornCounter({ className = "" }: { className?: string }) {
  const { balance } = useGameState();
  const [bump, setBump] = useState(false);
  const [prev, setPrev] = useState(balance);
  if (balance !== prev) {
    setPrev(balance);
    setBump(true);
  }
  useEffect(() => {
    if (!bump) return;
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [bump]);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-display text-lg font-bold text-ink shadow-sm ring-1 ring-ink/10 ${bump ? "pop-in" : ""} ${className}`}
      aria-label={`${balance} acorns`}
      data-testid="acorn-balance"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3c-1 0-1.5.6-1.6 1.6C6.8 5 4 7 4 10h16c0-3-2.8-5-6.4-5.4C13.5 3.6 13 3 12 3z" fill="#7E4A33" />
        <path d="M5 10h14c0 6-3.2 11-7 11S5 16 5 10z" fill="#D9A35B" />
      </svg>
      <span aria-hidden="true">{balance}</span>
    </span>
  );
}

/** Applies the player's in-app reduced-motion preference. */
export function MotionPreference({ reduced }: { reduced: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduced);
    return () => document.documentElement.classList.remove("reduce-motion");
  }, [reduced]);
  return null;
}

/**
 * Pushes a page-fresh server balance into the HUD. Layouts can be served from
 * the router's prefetch cache, so each game page re-syncs on mount.
 */
export function SyncBalance({ value }: { value: number }) {
  const { setBalance } = useGameState();
  useEffect(() => {
    setBalance(value);
  }, [value, setBalance]);
  return null;
}
