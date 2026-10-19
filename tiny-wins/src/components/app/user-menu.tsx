import { Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SettingsButton() {
  return (
    <Button asChild variant="ghost" size="icon-sm" aria-label="Settings">
      <Link href="/settings">
        <Settings className="size-5" />
      </Link>
    </Button>
  );
}
