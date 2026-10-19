import type { ReactNode } from "react";
import { inputClass } from "@/components/ui";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export const adminInput = `${inputClass} py-2.5`;

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    published: "bg-[#E3F4E3] text-[#235B2E]",
    coming_soon: "bg-sky text-ink",
    draft: "bg-cream-200 text-ink-soft",
    archived: "bg-ink/10 text-ink-soft",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide ${tone[status] ?? "bg-sage"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
