import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaveCard } from "@/components/marketing/leave-card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Leave the waitlist", robots: { index: false } };

export default function Page({ searchParams }: PageProps<"/waitlist/leave">) {
  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-lg items-center justify-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-border/70 bg-card p-8 shadow-lift">
        <Suspense fallback={<Skeleton className="mx-auto h-72 w-full" />}>
          <TokenGate searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function TokenGate({ searchParams }: { searchParams: PageProps<"/waitlist/leave">["searchParams"] }) {
  const { token } = await searchParams;
  return <LeaveCard token={typeof token === "string" ? token : ""} />;
}
