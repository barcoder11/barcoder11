import { describe, expect, it } from "vitest";
import { signUpSchema } from "@/lib/auth/validation";
import { isDisposableEmail, looksLikeBot, MIN_FILL_MS, waitlistRequestSchema } from "@/lib/waitlist/validation";

describe("waitlist validation", () => {
  it("normalizes email", () => {
    const r = waitlistRequestSchema.parse({ email: "  Pip.Fan@Example.COM " });
    expect(r.email).toBe("pip.fan@example.com");
  });
  it("rejects bad emails", () => {
    for (const email of ["", "nope", "a@", "@b.com", `${"x".repeat(250)}@a.com`]) {
      expect(waitlistRequestSchema.safeParse({ email }).success, email).toBe(false);
    }
  });
  it("flags disposable domains", () => {
    expect(isDisposableEmail("a@mailinator.com")).toBe(true);
    expect(isDisposableEmail("a@sub.yopmail.com")).toBe(true);
    expect(isDisposableEmail("a@gmail.com")).toBe(false);
  });
  it("detects bots via honeypot and timing", () => {
    const now = 1_000_000;
    expect(looksLikeBot({ company: "ACME", startedAt: now - 10_000 }, now)).toBe(true);
    expect(looksLikeBot({ company: "", startedAt: now - 100 }, now)).toBe(true);
    expect(looksLikeBot({ company: "", startedAt: now - MIN_FILL_MS - 1 }, now)).toBe(false);
    expect(looksLikeBot({ company: "" }, now)).toBe(false);
  });
});

describe("signup validation", () => {
  it("requires a decent password and agreement", () => {
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "acorns4ever", agree: "on" }).success).toBe(true);
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "short1", agree: "on" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "onlyletters", agree: "on" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "acorns4ever" }).success).toBe(false);
  });
});
