import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import * as bento from "../registry/yorha/layout/bento/bento.stories";
import { renderStory } from "./helpers";

// Bento coverage follows the current stories (ids unchanged, widths 1200/720/360):
// - ResponsiveDashboard: the docs-hero dashboard at 1200/720/360 (`data-bento=w<width>`)
// - Presets (hidden from docs, still a story): dashboard/feature/profile presets at the same widths
// - TileStates: ready/loading/error/empty tiles in one row
// - ThreeThemes: the dashboard under light/dark/high-contrast (`data-bento=<theme>`)
const WIDTHS = [1200, 720, 360] as const;
const PRESETS = ["dashboard", "feature", "profile"] as const;
const THEMES = ["light", "dark", "high-contrast"] as const;

async function shoot(story: unknown, selector: string, name: string) {
  await renderStory(bento.default as never, story as never, "light");
  const el = document.querySelector<HTMLElement>(selector);
  expect(el, selector).not.toBeNull();
  await expect(page.elementLocator(el!)).toMatchScreenshot(name);
}

describe("visual regression: bento", () => {
  for (const width of WIDTHS) {
    test(`bento-dashboard-${width}`, () => shoot(bento.ResponsiveDashboard, `[data-bento="w${width}"]`, `bento-dashboard-${width}`));
  }
  for (const preset of PRESETS) {
    for (const width of WIDTHS) {
      test(`bento-preset-${preset}-${width}`, () => shoot(bento.Presets, `[data-bento="${preset}-${width}"]`, `bento-preset-${preset}-${width}`));
    }
  }
  test("bento-tile-states", () => shoot(bento.TileStates, '[data-bento="states-grid"]', "bento-tile-states"));
  for (const theme of THEMES) {
    test(`bento-theme-${theme}`, () => shoot(bento.ThreeThemes, `[data-bento="${theme}"]`, `bento-theme-${theme}`));
  }
});
