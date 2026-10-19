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
