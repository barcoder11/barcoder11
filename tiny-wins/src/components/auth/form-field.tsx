"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input"> & { label: string; error?: string; hint?: string };

export function FormField({ label, error, hint, type, className, ...props }: Props) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && show ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined}
          className={cn(isPassword && "pr-12")}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ kind = "error", children }: { kind?: "error" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm font-semibold",
        kind === "error" ? "bg-destructive/10 text-destructive" : "bg-sage text-forest-deep dark:bg-secondary dark:text-sage",
      )}
    >
      {children}
    </div>
  );
}
