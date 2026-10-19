"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  selected: boolean;
  onToggle: () => void;
  emoji?: string;
  title: string;
  description?: string;
  multi?: boolean;
  color?: string;
};

/** Big tappable option card used in onboarding and settings. */
export function ChoiceCard({ selected, onToggle, emoji, title, description, multi, color }: Props) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "press-3d relative flex w-full items-center gap-3 rounded-2xl border-2 bg-card p-3.5 text-left transition-colors",
        selected ? "border-primary bg-sage/50 dark:bg-secondary/60" : "border-border hover:border-primary/40",
      )}
    >
      {emoji && (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: color ? `${color}26` : undefined }} aria-hidden>
          {emoji}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-semibold">{title}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
          !multi && "rounded-full",
        )}
        aria-hidden
      >
        {selected && <Check className="size-4 stroke-[3]" />}
      </span>
    </button>
  );
}
