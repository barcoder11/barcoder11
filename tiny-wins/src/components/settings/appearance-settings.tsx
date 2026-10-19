"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";
import { useMotionPreference } from "@/components/providers/motion-preference";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const noop = () => () => {};

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const { reduceMotion, setReduceMotion } = useMotionPreference();
  const motionId = useId();
  const options = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Auto", icon: Monitor },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-semibold">Theme</p>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
          {options.map(({ id, label, icon: Icon }) => {
            const active = mounted && theme === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(id)}
                className={cn(
                  "press-3d flex flex-col items-center gap-1 rounded-2xl border-2 bg-card py-3 text-sm font-bold",
                  active ? "border-primary bg-sage/50 dark:bg-secondary/60" : "border-border",
                )}
              >
                <Icon className="size-5" /> {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div>
          <Label htmlFor={motionId} className="text-base">Reduce motion</Label>
          <p className="text-sm text-muted-foreground">Turns off bouncing, floating and celebration effects. We also follow your device setting.</p>
        </div>
        <Switch id={motionId} checked={reduceMotion} onCheckedChange={setReduceMotion} />
      </div>
    </div>
  );
}
