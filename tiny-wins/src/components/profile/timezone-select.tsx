"use client";

import { useId, useMemo } from "react";
import { Label } from "@/components/ui/label";

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function TimezoneSelect({ value, onChange, disabled }: { value: string; onChange: (tz: string) => void; disabled?: boolean }) {
  const id = useId();
  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      list = [];
    }
    if (!list.includes("UTC")) list = ["UTC", ...list];
    if (value && !list.includes(value)) list = [value, ...list];
    return list;
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Your timezone</Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/20 disabled:opacity-60"
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">New quests arrive at midnight in this timezone.</p>
    </div>
  );
}
