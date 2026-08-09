import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests only — Playwright owns *.spec.ts under tests/ (npm run test:e2e).
    include: ["src/**/*.test.ts"],
  },
});
