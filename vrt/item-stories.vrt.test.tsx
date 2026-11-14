import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { THEMES, collectItems, renderStory } from "./helpers";

// One story per registry item with stories (States, else Default, else first export), in light/dark/high-contrast.
// ui, layout, router, sound, providers and blocks (bento-dashboard, settings-form, yorha-demo).
const modules = import.meta.glob<Record<string, unknown> & { default: Record<string, unknown> }>(
  "../registry/yorha/*/*/*.stories.tsx",
  { eager: true },
);
const items = collectItems(modules);

describe("visual regression: registry items", () => {
  for (const item of items) {
    for (const theme of THEMES) {
      test(`${item.id} [${theme}]`, async () => {
        const container = await renderStory(item.meta, item.story, theme);
        expect(document.documentElement.getAttribute("data-motion")).toBe("off");
        expect(document.documentElement.getAttribute("data-theme")).toBe(theme);
        await expect(page.elementLocator(container)).toMatchScreenshot(`${item.id}-${theme}`);
      });
    }
  }
});
