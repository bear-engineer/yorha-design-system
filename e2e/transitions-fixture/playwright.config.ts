import { defineConfig } from "@playwright/test";

// Standalone config: the shared e2e config only matches smoke.spec.ts.
// Run: pnpm exec playwright test e2e/transitions.spec.ts --config e2e/transitions-fixture/playwright.config.ts
export default defineConfig({
  testDir: "..",
  testMatch: "transitions.spec.ts",
  outputDir: "../.out/pw-transitions",
  reporter: [["list"]],
  retries: 0,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5199", browserName: "chromium" },
  webServer: {
    command: "pnpm exec vite --config e2e/transitions-fixture/vite.config.ts --host 127.0.0.1",
    url: "http://127.0.0.1:5199",
    reuseExistingServer: false,
    cwd: "../..",
    timeout: 60_000,
  },
});
