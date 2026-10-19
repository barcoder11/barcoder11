"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { AcornIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TURNSTILE_SITE_KEY } from "@/lib/env";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; state: "pending" | "confirmed"; devConfirmUrl?: string }
  | { kind: "error"; message: string };

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

function attribution() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source") ?? params.get("ref") ?? params.get("source") ?? undefined;
  const referrer = document.referrer ? document.referrer.slice(0, 500) : undefined;
  return { source: source?.slice(0, 100), referrer };
}

export function WaitlistForm({
  className,
  size = "lg",
  id,
  buttonVariant = "default",
}: {
  className?: string;
  size?: "lg" | "md";
  id?: string;
  buttonVariant?: "default" | "honey";
}) {
  const inputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const startedAt = useRef<number | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileToken = useRef<string | undefined>(undefined);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const renderTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || !window.turnstile) return;
    if (turnstileRef.current.childElementCount > 0) return;
    window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      size: "flexible",
      appearance: "interaction-only",
      callback: (t: string) => (turnstileToken.current = t),
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind === "submitting") return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus({ kind: "error", message: "That doesn't look like an email address." });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          company,
          startedAt: startedAt.current ?? undefined,
          turnstileToken: turnstileToken.current,
          ...attribution(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        state?: "pending" | "confirmed";
        devConfirmUrl?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
        window.turnstile?.reset();
        return;
      }
      setStatus({ kind: "done", state: data.state ?? "pending", devConfirmUrl: data.devConfirmUrl });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the treehouse. Check your connection and try again." });
    }
  }

  const big = size === "lg";

  return (
    <div id={id} className={cn("w-full", className)}>
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" onLoad={renderTurnstile} />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {status.kind === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="rounded-3xl border-2 border-forest/20 bg-sage/70 p-5 text-left dark:bg-secondary/60"
            role="status"
            aria-live="polite"
          >
            <p className="flex items-center gap-2 font-display text-xl font-bold text-forest-deep dark:text-sage">
              <AcornIcon className="size-6" />
              {status.state === "confirmed" ? "You're already on the list!" : "Almost there! Check your inbox."}
            </p>
            <p className="mt-1 text-sm text-forest-deep/80 dark:text-sage/80">
              {status.state === "confirmed"
                ? "Pip remembers you. We'll email you the moment the treehouse doors open."
                : "We sent you a confirmation link. Tap it to lock in your spot (check spam or promotions if you don't see it)."}
            </p>
            {status.devConfirmUrl && (
              <p className="mt-3 rounded-xl bg-card/80 p-3 text-xs break-all">
                <strong>Dev mode:</strong> email isn&apos;t configured, so here&apos;s the link:{" "}
                <a className="text-primary underline" href={status.devConfirmUrl}>
                  {status.devConfirmUrl}
                </a>
              </p>
            )}
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate exit={{ opacity: 0, y: -6 }} className="w-full">
            <div className={cn("flex w-full flex-col gap-2 sm:flex-row", big && "sm:rounded-full sm:bg-card sm:p-1.5 sm:shadow-lift")}>
              <label htmlFor={inputId} className="sr-only">
                Email address
              </label>
              <Input
                id={inputId}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status.kind === "error") setStatus({ kind: "idle" });
                }}
                aria-invalid={status.kind === "error"}
                aria-describedby={status.kind === "error" ? errorId : undefined}
                required
                maxLength={254}
                className={cn(big && "h-14 sm:h-12 sm:rounded-full sm:border-0 sm:shadow-none sm:focus-visible:ring-0", "sm:flex-1")}
              />
              {/* Honeypot: hidden from people, tempting for bots. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Company
                  <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} name="company" />
                </label>
              </div>
              <Button type="submit" variant={buttonVariant} size={big ? "lg" : "default"} disabled={status.kind === "submitting"} className={cn(big && "sm:h-12")}>
                {status.kind === "submitting" ? "Joining…" : "Get early access"}
              </Button>
            </div>
            {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="mt-2" />}
            <p id={errorId} role="alert" className="mt-2 min-h-5 px-2 text-sm font-semibold text-destructive">
              {status.kind === "error" ? status.message : ""}
            </p>
            <p className="px-2 text-xs text-muted-foreground">
              Free early access. No spam, just Pip news. Read our{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                privacy policy
              </Link>
              .
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
