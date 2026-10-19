import { describe, expect, it } from "vitest";
import { sanitizeNext } from "./safe-redirect";
import { cleanToken, decodeFirstTouch, encodeFirstTouch, firstTouchFromUrl, isUuid } from "./attribution";
import { buildRescueLink } from "./links";
import { levelProgress, reactionText } from "./game";

describe("sanitizeNext (open-redirect protection)", () => {
  it.each([
    ["/animals/maple/adopt", "/animals/maple/adopt"],
    ["/app/animals/123?welcome=1", "/app/animals/123?welcome=1"],
    ["/r/maple-flood-rescue", "/r/maple-flood-rescue"],
    ["%2Fanimals%2Fmaple%2Fadopt", "/animals/maple/adopt"],
  ])("allows %s", (input, out) => expect(sanitizeNext(input)).toBe(out));

  it.each([
    "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/app/../../etc", "/somewhere-else",
    "%2F%2Fevil.com", "/app\n", "", null, undefined, "/" + "a".repeat(400),
  ])("rejects %s", (input) => expect(sanitizeNext(input as string)).toBe("/app"));
});

describe("attribution", () => {
  it("captures first touch from rescue links only, sanitising values", () => {
    const t = firstTouchFromUrl("/r/maple-flood-rescue", new URLSearchParams("utm_source=Instagram&utm_medium=reel&utm_campaign=maple<launch>&utm_content=reel_001"));
    expect(t).toMatchObject({ rescue_slug: "maple-flood-rescue", source: "instagram", medium: "reel", campaign: "maplelaunch", content: "reel_001" });
    expect(firstTouchFromUrl("/animals/maple", new URLSearchParams("utm_source=x"))).toBeNull();
    expect(firstTouchFromUrl("/r/maple", new URLSearchParams())?.source).toBe("direct");
  });
  it("round-trips through the cookie and rejects garbage", () => {
    const t = { rescue_slug: "maple-flood-rescue", source: "tiktok" };
    expect(decodeFirstTouch(encodeFirstTouch(t))).toMatchObject(t);
    expect(decodeFirstTouch("not-base64!!")).toBeNull();
    expect(decodeFirstTouch(Buffer.from('{"source":"<script>"}').toString("base64url"))?.source).toBe("script");
  });
  it("cleans tokens and validates uuids", () => {
    expect(cleanToken("  Face Book!! ")).toBe("facebook");
    expect(cleanToken("")).toBeUndefined();
    expect(isUuid("1b4e28ba-2fa1-41d2-883f-0016d3cca427")).toBe(true);
    expect(isUuid("nope")).toBe(false);
  });
});

describe("buildRescueLink", () => {
  it("builds platform-tagged links", () => {
    const url = buildRescueLink({ siteUrl: "https://pawtopia.example", rescueSlug: "maple-flood-rescue", platform: "instagram", campaign: "Maple Launch", content: "reel 001" });
    expect(url).toBe("https://pawtopia.example/r/maple-flood-rescue?utm_source=instagram&utm_medium=reel&utm_campaign=maple_launch&utm_content=reel_001");
  });
});

describe("game helpers", () => {
  const t = [0, 15, 40, 75];
  it("computes level progress", () => {
    expect(levelProgress(0, t)).toEqual({ level: 1, pct: 0, toNext: 15 });
    expect(levelProgress(20, t)).toMatchObject({ level: 2, toNext: 20 });
    expect(levelProgress(100, t)).toMatchObject({ level: 4, pct: 100 });
  });
  it("personalises reactions", () => {
    expect(reactionText("snack", "Pip", 4)).toContain("Pip");
  });
});

describe("personalize", () => {
  it("replaces whole words only", async () => {
    const { personalize } = await import("./game");
    expect(personalize("Acorn found an acorn. Acorns? Acorn!", "Acorn", "Pip")).toBe("Pip found an acorn. Acorns? Pip!");
    expect(personalize("Maple smiles.", "Maple", "Maple")).toBe("Maple smiles.");
    // Regex characters in names are literal: "Mr.Pip" must not match "MrXPip".
    expect(personalize("Mr.Pip naps. MrXPip naps.", "Mr.Pip", "Bo")).toBe("Bo naps. MrXPip naps.");
  });
});

describe("toCsv", () => {
  it("quotes, escapes and neutralises formulas", async () => {
    const { toCsv } = await import("./csv");
    expect(toCsv(["email", "note"], [["a@b.co", 'say "hi", ok'], ["=HYPERLINK(1)", null], ["-1+2", "line\nbreak"]])).toBe(
      'email,note\r\na@b.co,"say ""hi"", ok"\r\n\'=HYPERLINK(1),\r\n\'-1+2,"line\nbreak"\r\n',
    );
  });
});

describe("buildCsp", () => {
  it("allows only this site, nonce'd scripts and the Supabase origin", async () => {
    const { buildCsp } = await import("./csp");
    const csp = buildCsp({ nonce: "abc", supabaseUrl: "https://xyz.supabase.co/", https: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self' https://xyz.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp.endsWith("upgrade-insecure-requests")).toBe(true);
  });
  it("adds unsafe-eval only in development and tolerates a missing Supabase URL", async () => {
    const { buildCsp } = await import("./csp");
    const csp = buildCsp({ nonce: "n", dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("isNewArrival", () => {
  it("flags animals published in the last 14 days only", async () => {
    const { isNewArrival } = await import("./animals");
    const now = Date.parse("2026-10-20T00:00:00Z");
    expect(isNewArrival({ status: "published", published_at: "2026-10-15T00:00:00Z" }, 14, now)).toBe(true);
    expect(isNewArrival({ status: "published", published_at: "2026-09-01T00:00:00Z" }, 14, now)).toBe(false);
    expect(isNewArrival({ status: "coming_soon", published_at: null }, 14, now)).toBe(false);
  });
});
