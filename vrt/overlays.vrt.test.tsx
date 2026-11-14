import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { collectItems, frames, renderStory } from "./helpers";

// Overlays rendered open, one per test (portaled popups are positioned in the viewport; the
// screenshot is the top-left 1280x800 stage, which the popups and scrims cover).
type Open = "click" | "hover" | "contextmenu" | "tab";
const OVERLAYS: Record<string, Open> = {
  dialog: "click",
  "alert-dialog": "click",
  popover: "click",
  tooltip: "tab",
  menu: "click",
  select: "click",
  combobox: "click",
  autocomplete: "click",
  drawer: "click",
  "context-menu": "contextmenu",
  "preview-card": "hover",
  "navigation-menu": "click",
  toast: "click",
};

const modules = import.meta.glob<Record<string, unknown> & { default: Record<string, unknown> }>(
  "../registry/yorha/ui/*/*.stories.tsx",
  { eager: true },
);
const byDir = new Map(collectItems(modules).map((i) => [i.dir, i]));
// Overlays use the Default story: it renders the closed demo with its trigger (States is a gallery).
const defaults = (dir: string) => {
  const path = Object.keys(modules).find((p) => p.includes(`/ui/${dir}/`));
  const mod = path ? modules[path] : undefined;
  if (!mod) throw new Error(`no stories module for ui/${dir}`);
  return { meta: mod.default, story: (mod.Default ?? byDir.get(dir)!.story) as Record<string, unknown> };
};

const TRIGGER = [
  "[data-slot=trigger]",
  "button:not([disabled])",
  "input",
  "[role=combobox]",
  "a[href]",
  "[tabindex='0']",
].join(",");

describe("visual regression: overlays open", () => {
  for (const [dir, mode] of Object.entries(OVERLAYS)) {
    test(`overlay-${dir}-open`, async () => {
      const { meta, story } = defaults(dir);
      const container = await renderStory(meta, story, "light", { width: "1280px", height: "800px", overflow: "hidden", position: "relative" });
      const trigger = container.querySelector<HTMLElement>(TRIGGER);
      expect(trigger, `${dir}: trigger`).not.toBeNull();
      const loc = page.elementLocator(trigger!);
      if (mode === "click") await loc.click();
      else if (mode === "hover") await loc.hover();
      else if (mode === "contextmenu") await loc.click({ button: "right" });
      else await userEvent.tab(); // keyboard focus opens tooltips
      // Input-anchored popups (autocomplete) open on ArrowDown.
      if (dir === "autocomplete") await userEvent.keyboard("{ArrowDown}");
      // Popups portal out of the container; wait until one is mounted and has settled.
      await expect
        .poll(() => document.querySelector("body > [data-base-ui-portal], body > div:not([data-vrt]) [role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=tooltip],[data-open],[data-popup-open]:not(button)"), { timeout: 4000 })
        .not.toBeNull();
      await frames(3);
      await document.fonts.ready;
      await expect(page.elementLocator(container)).toMatchScreenshot(`overlay-${dir}-open`);
    });
  }
});
