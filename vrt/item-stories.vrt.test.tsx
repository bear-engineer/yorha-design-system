import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { composeStory, setProjectAnnotations } from "@storybook/react-vite";
import * as previewAnnotations from "../.storybook/preview";
import "../src/styles/storybook.css";

// Storybook project annotations (decorators, globals, a11y params) apply to composed stories.
setProjectAnnotations([previewAnnotations]);

type Theme = "light" | "dark";
const THEMES: readonly Theme[] = ["light", "dark"];

// One representative story per ui/layout item: the first named export of its stories file.
type StoryModule = Record<string, unknown> & { default: Record<string, unknown> };
const modules = import.meta.glob<StoryModule>("../registry/yorha/{ui,layout}/*/*.stories.tsx", { eager: true });

const items = Object.entries(modules)
  .map(([path, mod]) => {
    const storyName = Object.keys(mod).find((key) => key !== "default");
    if (!storyName) throw new Error(`no named story export in ${path}`);
    const name = path.split("/").at(-2) ?? path;
    const group = path.includes("/layout/") ? "layout" : "ui";
    return { id: `${group}-${name}`, meta: mod.default, story: mod[storyName] as Record<string, unknown> };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

// Freeze motion and caret blink so screenshots are deterministic.
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}`;

let mounted: { root: Root; container: HTMLElement; style: HTMLStyleElement } | undefined;

function unmount() {
  if (!mounted) return;
  mounted.root.unmount();
  mounted.container.remove();
  mounted.style.remove();
  mounted = undefined;
}

afterEach(unmount);

async function renderStory(meta: Record<string, unknown>, story: Record<string, unknown>, theme: Theme) {
  const composed = composeStory({ ...story, globals: { theme, motion: "off", density: "comfortable" } }, meta as never);
  const Component = composed as unknown as ComponentType;

  const style = document.createElement("style");
  style.textContent = FREEZE_CSS;
  document.head.append(style);

  const container = document.createElement("div");
  container.dataset.vrt = "root";
  document.body.append(container);

  const root = createRoot(container);
  root.render(createElement(Component));
  mounted = { root, container, style };

  // Two frames for layout and effects, then fonts.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await document.fonts.ready;
  return container;
}

describe("visual regression: ui/layout representative stories", () => {
  for (const item of items) {
    for (const theme of THEMES) {
      test(`${item.id} [${theme}]`, async () => {
        const container = await renderStory(item.meta, item.story, theme);
        expect(document.documentElement.getAttribute("data-motion")).toBe("off");
        await expect(page.elementLocator(container)).toMatchScreenshot(`${item.id}-${theme}`);
      });
    }
  }
});
