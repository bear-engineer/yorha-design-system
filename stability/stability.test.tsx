import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { composeStory, setProjectAnnotations } from "@storybook/react-vite";
import * as previewAnnotations from "../.storybook/preview";
import "../src/styles/storybook.css";
import { checkControl, fmt, INTERACTIVE_SELECTOR, isDisabled } from "./measure";

// Storybook project annotations (decorators, globals) apply to composed stories.
setProjectAnnotations([previewAnnotations]);

type StoryModule = Record<string, unknown> & { default: Record<string, unknown> };
const modules = import.meta.glob<StoryModule>("../registry/yorha/ui/*/*.stories.tsx", { eager: true });

/** Items under guard. A later node extends this list (and the helper in ./measure) to every item. */
export const ITEMS = ["checkbox", "toggle", "radio-group", "switch", "slider", "tabs", "checkbox-group", "toggle-group"] as const;
export const STORIES = ["States", "Default"] as const;

const mounted: { root: Root; container: HTMLElement }[] = [];
afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
  }
});

const frames = (n: number) => new Promise<void>((resolve) => {
  const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
  step(n);
});

/** Render a story with real (full) motion so transitions actually run. lang=ko like the real docs. */
export async function mountStory(item: string, name: string): Promise<HTMLElement> {
  const mod = modules[`../registry/yorha/ui/${item}/${item}.stories.tsx`];
  if (!mod) throw new Error(`stories file not found for ${item}`);
  const story = mod[name];
  if (!story) throw new Error(`story ${name} not found in ${item}`);
  const composed = composeStory({ ...(story as object), globals: { theme: "light", motion: "full", density: "comfortable" } } as never, mod.default as never);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  root.render(createElement("div", { lang: "ko" }, createElement(composed as unknown as ComponentType)));
  await frames(2);
  await document.fonts.ready;
  await frames(2);
  return container.firstElementChild as HTMLElement;
}

describe("state changes never move or resize a control or its row", () => {
  for (const item of ITEMS) {
    for (const name of STORIES) {
      if (!modules[`../registry/yorha/ui/${item}/${item}.stories.tsx`]?.[name]) continue;
      test(`${item} / ${name}`, async () => {
        const wrapper = await mountStory(item, name);
        const controls = [...wrapper.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)].filter((el) => !isDisabled(el));
        expect(controls.length, "no interactive control found (vacuous pass)").toBeGreaterThan(0);
        const failures: string[] = [];
        for (const [i, el] of controls.entries()) {
          const shifts = await checkControl(el);
          if (shifts.length) failures.push(`#${i} ${el.getAttribute("role") ?? el.tagName} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 20)}": ${fmt(shifts)}`);
        }
        expect(failures, failures.join("\n")).toEqual([]);
      });
    }
  }
});
