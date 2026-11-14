import { defineConfig } from "@playwright/test";

// The app under test is started by e2e/install.sh; it passes its URL in E2E_APP_URL.
export default defineConfig({
  testDir: ".",
  testMatch: ["smoke.spec.ts", "transitions.spec.ts"],
  outputDir: ".out/pw-results",
  reporter: [["list"]],
  retries: 0,
  workers: 1,
  use: { baseURL: process.env.E2E_APP_URL, locale: "ko-KR", browserName: "chromium" },
});
