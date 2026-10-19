// Friendly messages for Supabase Auth errors (no technical details shown to players).

type AuthStep = "email" | "code" | "link";

type AuthErrorLike = { status?: number; code?: string; message?: string } | null | undefined;

export function authErrorMessage(error: AuthErrorLike, step: AuthStep): string | null {
  if (!error) return null;
  const code = error.code ?? "";
  if (error.status === 429 || code.startsWith("over_")) {
    return "Too many attempts right now. Please wait a minute and try again.";
  }
  if (step === "code") return "That code didn't work or has expired. Check your latest email, or send a new code.";
  if (step === "link") return "This sign-in link has expired or was already used. Request a new code to continue.";
  return "We couldn't send the email right now. Please try again shortly.";
}
