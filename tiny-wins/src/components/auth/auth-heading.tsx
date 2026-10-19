import { Pip } from "@/components/pip/pip";
import type { PipPose } from "@/components/pip/pip-assets";

export function AuthHeading({ title, subtitle, pose = "idle" }: { title: string; subtitle?: React.ReactNode; pose?: PipPose }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="lg:hidden">
        <Pip pose={pose} size={84} />
      </div>
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
