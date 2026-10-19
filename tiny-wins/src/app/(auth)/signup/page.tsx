import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { NotConfiguredNotice } from "@/components/auth/not-configured";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <>
      <AuthHeading title="Join the treehouse" subtitle="Create an account to start growing with Pip." pose="cheer" />
      <div className="flex flex-col gap-4">
        <NotConfiguredNotice />
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}
