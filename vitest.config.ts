import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // @storybook/addon-vitest ignores builder.viteConfigPath: Tailwind must be loaded here too.
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  // Pre-bundle deps that otherwise trigger a Vite reload (and a failed first run) on cold cache.
  optimizeDeps: { include: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"] },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["registry/**/*.test.ts", "scripts/**/*.test.ts", "src/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: fileURLToPath(new URL("./.storybook", import.meta.url)) })],
        test: {
          name: "storybook",
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
        },
      },
      {
        extends: true,
        test: {
          name: "vrt",
          include: ["vrt/**/*.vrt.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ contextOptions: { deviceScaleFactor: 1, reducedMotion: "reduce" } }),
            instances: [{ browser: "chromium", viewport: { width: 1280, height: 800 } }],
          },
        },
      },
      {
        // WCAG 1.4.12 text spacing: representative stories must not clip text. Inherits react + tailwind from root.
        extends: true,
        test: {
          name: "text-spacing",
          include: ["text-spacing/**/*.test.tsx"],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium", viewport: { width: 1280, height: 800 } }] },
        },
      },
    ],
  },
});
