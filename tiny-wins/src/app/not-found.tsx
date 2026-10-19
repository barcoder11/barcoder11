import Link from "next/link";
import { Pip } from "@/components/pip/pip";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Pip pose="sleepy" size={160} />
        <h1 className="text-4xl font-bold">Hmm, this branch is empty</h1>
        <p className="max-w-sm text-muted-foreground">We couldn&apos;t find that page. Pip may have buried it with his acorns.</p>
        <Button asChild>
          <Link href="/">Back to the treehouse</Link>
        </Button>
      </div>
    </main>
  );
}
