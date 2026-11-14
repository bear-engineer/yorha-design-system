import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import * as bento from "../registry/yorha/layout/bento/bento.stories";
import { renderStory } from "./helpers";

// Bento presets at 360/768/1280: the Presets story renders each preset in a fixed-width frame.
const PRESETS = ["dashboard", "feature", "profile"] as const;
const WIDTHS = [360, 768, 1280] as const;

describe("visual regression: bento presets", () => {
  for (const preset of PRESETS) {
    for (const width of WIDTHS) {
      test(`bento-${preset}-${width}`, async () => {
        await renderStory(bento.default as never, bento.Presets as never, "light");
        const el = document.querySelector<HTMLElement>(`[data-bento="${preset}-${width}"]`);
        expect(el, `[data-bento=${preset}-${width}]`).not.toBeNull();
        await expect(page.elementLocator(el!)).toMatchScreenshot(`bento-${preset}-${width}`);
      });
    }
  }
});
