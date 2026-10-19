import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Choose a new password" subtitle="Make it something only you (and not Pip) would guess." />
      <ResetForm />
    </>
  );
}
