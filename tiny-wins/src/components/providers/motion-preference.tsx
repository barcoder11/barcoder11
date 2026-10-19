"use client";

import { MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

const KEY = "tw-reduce-motion";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

type Ctx = { reduceMotion: boolean; setReduceMotion: (v: boolean) => void };
const MotionPrefContext = createContext<Ctx>({ reduceMotion: false, setReduceMotion: () => {} });

/** In-app "reduce motion" switch, layered on top of the OS setting. */
export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useSyncExternalStore(subscribe, read, () => false);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  const setReduceMotion = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(KEY, String(v));
    } catch {
      // storage unavailable (private mode): preference lasts for this page only
    }
    document.documentElement.dataset.reduceMotion = String(v);
    listeners.forEach((l) => l());
  }, []);

  return (
    <MotionPrefContext value={{ reduceMotion, setReduceMotion }}>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>
    </MotionPrefContext>
  );
}

export const useMotionPreference = () => useContext(MotionPrefContext);
