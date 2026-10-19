import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email({ message: "Please enter a valid email." }));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.")
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), "Mix in at least one letter and one number.");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  agree: z.literal("on", { message: "Please confirm you're 13+ and agree to the terms." }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password.").max(200),
});
