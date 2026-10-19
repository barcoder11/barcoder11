import { describe, expect, it } from "vitest";
import { svgToString } from "./svg-string";
import { CritterSvg } from "@/components/art/Critter";

describe("svgToString", () => {
  it("serialises SVG JSX with kebab-case attributes and escaping", () => {
    const out = svgToString(
      <svg viewBox="0 0 10 10" className="a">
        <path strokeWidth={2} d="M0 0" />
        <text>{"<hi>"}</text>
      </svg>,
    );
    expect(out).toBe(
      '<svg viewBox="0 0 10 10" class="a"><path stroke-width="2" d="M0 0"></path><text>&lt;hi&gt;</text></svg>',
    );
  });
  it("renders the placeholder character without hooks", () => {
    const out = svgToString(<CritterSvg uid="t" variant="raccoon" title="Maple" state="happy" />);
    expect(out.startsWith("<svg")).toBe(true);
    expect(out).toContain('aria-label="Maple"');
    expect(out).toContain("radialGradient");
  });
});
