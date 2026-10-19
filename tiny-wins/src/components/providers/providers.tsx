"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { MotionPreferenceProvider } from "./motion-preference";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionPreferenceProvider>
        {children}
        <Toaster />
      </MotionPreferenceProvider>
    </ThemeProvider>
  );
}
