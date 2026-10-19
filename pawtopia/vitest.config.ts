import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts", "tests/db/**/*.test.ts"],
    environment: "node",
    // DB tests share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
