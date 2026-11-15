import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Tests must never reach a cloud LLM.
    env: { AGENTS_OFFLINE: "1" },
  },
});
