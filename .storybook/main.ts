import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/docs/**/*.mdx", "../src/docs/**/*.stories.tsx", "../registry/**/*.mdx", "../registry/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: { name: "@storybook/react-vite", options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } } },
  core: { disableTelemetry: true },
  // Docs-only parameters (docs container with the single <main> landmark).
  previewAnnotations: async (entries = []) => [...entries, fileURLToPath(new URL("../src/docs/docs-preview.ts", import.meta.url))],
};
export default config;
