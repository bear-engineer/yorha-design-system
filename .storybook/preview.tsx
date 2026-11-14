import type { Preview } from "@storybook/react-vite";
import { DENSITIES, decorators, MOTIONS, THEMES } from "./decorators";
import "../src/styles/storybook.css";

const toolbar = (title: string, icon: "paintbrush" | "play" | "grow", items: readonly string[]) => ({
  description: title,
  toolbar: { title, icon, items: items.map((value) => ({ value, title: value })), dynamicTitle: true },
});

const preview: Preview = {
  decorators,
  globalTypes: {
    theme: toolbar("Theme", "paintbrush", THEMES),
    motion: toolbar("Motion", "play", MOTIONS),
    density: toolbar("Density", "grow", DENSITIES),
  },
  initialGlobals: { theme: "light", motion: "full", density: "comfortable" },
  parameters: {
    layout: "padded",
    // WCAG 2.5.8 (T10): target-size is enforced explicitly on every story.
    a11y: { test: "error", config: { rules: [{ id: "target-size", enabled: true }] } },
  },
};
export default preview;
