import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error -- plain ESM script without type declarations
import { bundle } from "../../scripts/bundle-sql.mjs";

describe("supabase/setup.sql", () => {
  it("matches the migrations + seed (run `npm run db:bundle` after changing them)", () => {
    const current = fs.readFileSync(path.resolve(__dirname, "../../supabase/setup.sql"), "utf8");
    expect(current === bundle()).toBe(true);
  });
});
