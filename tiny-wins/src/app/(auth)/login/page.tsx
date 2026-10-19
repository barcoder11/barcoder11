import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { NotConfiguredNotice } from "@/components/auth/not-configured";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AuthHeading title="Welcome back!" subtitle="Pip has been keeping your treehouse cozy." pose="wave" />
      <div className="flex flex-col gap-4">
        <NotConfiguredNotice />
        <Suspense fallback={<Skeleton className="h-72" />}>
          <LoginWithParams searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-bold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <LoginForm next={str(sp.next)} linkError={str(sp.error)} />;
}
