"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Pip } from "@/components/pip/pip";
import type { PipPose } from "@/components/pip/pip-assets";
import { ChoiceCard } from "@/components/profile/choice-card";
import { detectTimezone, TimezoneSelect } from "@/components/profile/timezone-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { saveProfileAction } from "@/lib/actions/game";
import { ENERGY_OPTIONS, GOAL_INFO, STEP_OPTIONS } from "@/lib/game/constants";
import { GOALS, type EnergyTime, type GoalId, type StepSize } from "@/lib/game/types";

const STEPS = ["welcome", "name", "goals", "energy", "steps", "ready"] as const;
type Step = (typeof STEPS)[number];

const noop = () => () => {};

export function OnboardingFlow({ suggestedName }: { suggestedName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState(suggestedName);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [energy, setEnergy] = useState<EnergyTime | null>(null);
  const [stepSize, setStepSize] = useState<StepSize | null>(null);
  const detected = useSyncExternalStore(noop, detectTimezone, () => "UTC");
  const [tzOverride, setTzOverride] = useState<string | null>(null);
  const timezone = tzOverride ?? detected;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const index = STEPS.indexOf(step);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const next = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => go(STEPS[Math.max(index - 1, 0)]);

  const pose: PipPose = step === "welcome" ? "wave" : step === "ready" ? "cheer" : step === "goals" && goals.length ? "happy" : "idle";
  const bubble: Record<Step, string> = {
    welcome: "Hi! I'm Pip. I'm trying to get better at stuff... want to do it together?",
    name: "What should I call you?",
    goals: "What do you want to grow in? Pick as many as you like!",
    energy: "When do you usually have the most energy?",
    steps: "How small should our steps be?",
    ready: `Yay, ${name.trim() || "friend"}! Our treehouse is ready. Let's earn our first acorns!`,
  };

  const canContinue =
    step === "welcome" ||
    (step === "name" && name.trim().length > 0 && name.trim().length <= 40) ||
    (step === "goals" && goals.length > 0) ||
    (step === "energy" && energy !== null) ||
    (step === "steps" && stepSize !== null);

  function finish() {
    if (!energy || !stepSize) return;
    startTransition(async () => {
      const res = await saveProfileAction({ displayName: name.trim(), goals, energyTime: energy, stepSize, timezone }, true);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/home?welcome=1");
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-5 safe-bottom">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={back} disabled={index === 0 || pending} aria-label="Back" className={index === 0 ? "invisible" : ""}>
          <ArrowLeft className="size-5" />
        </Button>
        <Progress value={((index + 1) / STEPS.length) * 100} className="h-3" aria-label={`Step ${index + 1} of ${STEPS.length}`} />
      </div>

      <div className="mt-6 flex items-end gap-3">
        <Pip pose={pose} size={step === "welcome" || step === "ready" ? 150 : 100} priority />
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-6 flex-1 rounded-3xl rounded-bl-md border border-border bg-card p-4 font-display text-lg leading-snug font-semibold shadow-soft"
            aria-live="polite"
          >
            {bubble[step]}
          </motion.p>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="mt-6 flex flex-1 flex-col gap-3"
        >
          {step === "welcome" && (
            <div className="rounded-3xl bg-sage/60 p-5 dark:bg-secondary/50">
              <h1 className="text-3xl font-bold">Welcome to Tiny Wins</h1>
              <p className="mt-2 text-muted-foreground">
                Every day you&apos;ll get three tiny quests. Finish them in real life, and Pip earns XP and acorns to build his
                treehouse. Missing a day is totally okay. No guilt here.
              </p>
            </div>
          )}

          {step === "name" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ob-name" className="text-base">Your name</Label>
              <Input
                id="ob-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="given-name"
                autoFocus
                placeholder="What should Pip call you?"
                onKeyDown={(e) => e.key === "Enter" && canContinue && next()}
              />
            </div>
          )}

          {step === "goals" && (
            <div role="group" aria-label="Goals" className="flex flex-col gap-2.5">
              {GOALS.map((g) => (
                <ChoiceCard
                  key={g}
                  multi
                  selected={goals.includes(g)}
                  onToggle={() => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
                  emoji={GOAL_INFO[g].emoji}
                  title={GOAL_INFO[g].label}
                  description={GOAL_INFO[g].blurb}
                  color={GOAL_INFO[g].color}
                />
              ))}
            </div>
          )}

          {step === "energy" && (
            <div role="radiogroup" aria-label="Energy" className="grid grid-cols-2 gap-2.5">
              {ENERGY_OPTIONS.map((o) => (
                <ChoiceCard key={o.id} selected={energy === o.id} onToggle={() => setEnergy(o.id)} emoji={o.emoji} title={o.label} />
              ))}
            </div>
          )}

          {step === "steps" && (
            <div className="flex flex-col gap-4">
              <div role="radiogroup" aria-label="Step size" className="flex flex-col gap-2.5">
                {STEP_OPTIONS.map((o) => (
                  <ChoiceCard
                    key={o.id}
                    selected={stepSize === o.id}
                    onToggle={() => setStepSize(o.id)}
                    emoji={o.id === "tiny" ? "🌱" : "🌿"}
                    title={o.label}
                    description={o.blurb}
                  />
                ))}
              </div>
              <TimezoneSelect value={timezone} onChange={setTzOverride} />
            </div>
          )}

          {step === "ready" && (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-2xl font-bold">Your plan</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li><strong>Goals:</strong> {goals.map((g) => `${GOAL_INFO[g].emoji} ${GOAL_INFO[g].label}`).join(", ")}</li>
                <li><strong>Best time:</strong> {ENERGY_OPTIONS.find((o) => o.id === energy)?.label}</li>
                <li><strong>Steps:</strong> {STEP_OPTIONS.find((o) => o.id === stepSize)?.label}</li>
                <li><strong>Timezone:</strong> {timezone.replaceAll("_", " ")}</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">You can change any of this later in Settings.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
        </motion.section>
      </AnimatePresence>

      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-background via-background pt-4">
        {step === "ready" ? (
          <Button size="lg" className="w-full" onClick={finish} disabled={pending}>
            {pending ? "Setting up your treehouse…" : "Start my first quests"}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={next} disabled={!canContinue}>
            {step === "welcome" ? "Let's go!" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}
