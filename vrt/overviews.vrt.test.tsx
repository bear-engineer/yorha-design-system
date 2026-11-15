import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { renderStory } from "./helpers";

// Docs heroes: every story module exporting `Overview` (overlays, batch B, provider, sound ...) plus the
// layout heroes that are not an item's States/Default (grid dashboard). Light theme, rendered as docs show them.
const modules = import.meta.glob<Record<string, unknown> & { default: Record<string, unknown> }>(
  "../registry/yorha/*/*/*.stories.tsx",
  { eager: true },
);

const EXTRA: Record<string, string> = { "layout/grid": "DashboardLayout" };

const heroes = Object.entries(modules)
  .filter(([path]) => path.split("/").at(-1) === `${path.split("/").at(-2)}.stories.tsx`)
  .flatMap(([path, mod]) => {
    const parts = path.split("/");
    const key = `${parts.at(-3)}/${parts.at(-2)}`;
    const name = EXTRA[key] ?? ("Overview" in mod ? "Overview" : undefined);
    return name && mod[name] ? [{ id: `${parts.at(-3)}-${parts.at(-2)}`, meta: mod.default, story: mod[name] as Record<string, unknown> }] : [];
  })
  .sort((a, b) => a.id.localeCompare(b.id));

describe("visual regression: docs heroes", () => {
  test("heroes are enumerated", () => expect(heroes.length).toBeGreaterThan(30));
  for (const hero of heroes) {
    test(`overview-${hero.id}`, async () => {
      const container = await renderStory(hero.meta, hero.story, "light");
      await expect(page.elementLocator(container)).toMatchScreenshot(`overview-${hero.id}`);
    });
  }
});
