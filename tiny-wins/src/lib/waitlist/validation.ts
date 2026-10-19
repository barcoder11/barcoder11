import { z } from "zod";

/** Common throwaway-inbox domains. Not exhaustive; just raises the bar. */
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "throwawaymail.com",
  "fakeinbox.com",
  "mintemail.com",
  "emailondeck.com",
  "mohmal.com",
  "mailnesia.com",
  "spamgourmet.com",
]);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain) || [...DISPOSABLE_DOMAINS].some((d) => domain.endsWith(`.${d}`));
}

/** Minimum time a human needs to fill in the form (bots submit instantly). */
export const MIN_FILL_MS = 1500;

export const waitlistRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, "Please enter your email.")
    .max(254, "That email is too long.")
    .transform(normalizeEmail)
    .pipe(z.email({ message: "That doesn't look like an email address." })),
  // Honeypot: real people never see or fill this field.
  company: z.string().max(200).optional().default(""),
  startedAt: z.number().int().nonnegative().optional(),
  source: z.string().trim().max(100).optional(),
  referrer: z.string().trim().max(500).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;

/** True when the submission looks automated (honeypot filled or too fast). */
export function looksLikeBot(req: Pick<WaitlistRequest, "company" | "startedAt">, now = Date.now()): boolean {
  if (req.company && req.company.length > 0) return true;
  if (req.startedAt !== undefined && now - req.startedAt < MIN_FILL_MS) return true;
  return false;
}
