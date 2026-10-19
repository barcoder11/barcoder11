"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChoiceCard } from "@/components/profile/choice-card";
import { TimezoneSelect } from "@/components/profile/timezone-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfileAction } from "@/lib/actions/game";
import { ENERGY_OPTIONS, GOAL_INFO, STEP_OPTIONS } from "@/lib/game/constants";
import { GOALS, type EnergyTime, type GoalId, type Profile, type StepSize } from "@/lib/game/types";

export function ProfileSettings({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [goals, setGoals] = useState<GoalId[]>(profile.goals);
  const [energy, setEnergy] = useState<EnergyTime>(profile.energy_time);
  const [stepSize, setStepSize] = useState<StepSize>(profile.step_size);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [pending, startTransition] = useTransition();

  const dirty =
    name !== (profile.display_name ?? "") ||
    goals.slice().sort().join() !== profile.goals.slice().sort().join() ||
    energy !== profile.energy_time ||
    stepSize !== profile.step_size ||
    timezone !== profile.timezone;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveProfileAction({ displayName: name, goals, energyTime: energy, stepSize, timezone });
      if (res.ok) toast.success("Saved! Changes to goals apply to tomorrow's quests.");
      else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-name">Name</Label>
        <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Goals</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => (
            <ChoiceCard
              key={g}
              multi
              selected={goals.includes(g)}
              onToggle={() => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
              emoji={GOAL_INFO[g].emoji}
              title={GOAL_INFO[g].label}
              color={GOAL_INFO[g].color}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Most energy in the</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ENERGY_OPTIONS.map((o) => (
            <ChoiceCard key={o.id} selected={energy === o.id} onToggle={() => setEnergy(o.id)} emoji={o.emoji} title={o.label} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Quest size</legend>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {STEP_OPTIONS.map((o) => (
            <ChoiceCard key={o.id} selected={stepSize === o.id} onToggle={() => setStepSize(o.id)} title={o.label} description={o.blurb} />
          ))}
        </div>
      </fieldset>

      <TimezoneSelect value={timezone} onChange={setTimezone} />

      <Button type="submit" disabled={!dirty || pending || goals.length === 0 || !name.trim()} className="self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
