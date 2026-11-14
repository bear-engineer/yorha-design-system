import type { Preview } from "@storybook/react-vite";
import { DENSITIES, decorators, MOTIONS, THEMES } from "./decorators";
import "../src/styles/storybook.css";

import { expect } from "storybook/test";

/** Pointer targets (WCAG 2.5.8). aria-hidden shadow inputs and 1px visually hidden helpers are skipped. */
const TARGET_SELECTOR = [
  "button", "a[href]", "input:not([type=hidden])", "select", "textarea", "summary",
  "[role=button]", "[role=tab]", "[role=option]", "[role=menuitem]", "[role=menuitemcheckbox]",
  "[role=menuitemradio]", "[role=checkbox]", "[role=radio]", "[role=switch]", "[role=slider]",
  "[role=combobox]", "[role=link]",
].join(",");

export interface TargetMeasure {
  label: string;
  width: number;
  height: number;
}

/** Visible interactive targets under `root` with their border-box size (T10 States stories). */
export function measureTargets(root: HTMLElement): TargetMeasure[] {
  const found: TargetMeasure[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(TARGET_SELECTOR)) {
    if (el.closest("[aria-hidden=true],[hidden],[inert]")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue;
    // Inline links inside running text are exempt (SC 2.5.8 inline exception).
    if (el.tagName === "A" && el.closest("p,li") && style.display === "inline") continue;
    const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24);
    const role = el.getAttribute("role");
    found.push({ label: `${el.tagName.toLowerCase()}${role ? `[${role}]` : ""} "${name}"`, width: rect.width, height: rect.height });
  }
  return found;
}

/**
 * Asserts every visible interactive target under `root` is at least `min` x `min` CSS px (SC 2.5.8),
 * at each density (spacing tokens scale with data-density). Restores the density afterwards.
 */
export async function expectTargetSize(root: HTMLElement, min = 24): Promise<TargetMeasure[]> {
  const html = document.documentElement;
  const previous = html.getAttribute("data-density");
  const all: TargetMeasure[] = [];
  try {
    for (const density of DENSITIES) {
      html.setAttribute("data-density", density);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const targets = measureTargets(root);
      expect(targets.length, "no interactive targets found").toBeGreaterThan(0);
      const small = targets.filter((t) => t.width < min - 0.5 || t.height < min - 0.5);
      expect(small, `${density}: targets under ${min}x${min}: ${JSON.stringify(small)}`).toEqual([]);
      all.push(...targets);
    }
  } finally {
    if (previous === null) html.removeAttribute("data-density");
    else html.setAttribute("data-density", previous);
  }
  return all;
}

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
  initialGlobals: { theme: "light", motion: "system", density: "comfortable" },
  parameters: {
    layout: "padded",
    // WCAG 2.5.8 (T10): target-size is enforced explicitly on every story.
    a11y: { test: "error", config: { rules: [{ id: "target-size", enabled: true }] } },
  },
};
export default preview;
