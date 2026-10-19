import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Forgot your password?" subtitle="No worries, it happens to squirrels too." />
      <ForgotForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-bold text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
