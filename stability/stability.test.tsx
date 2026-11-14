import { describe, expect, test } from "vitest";
import { checkControl, fmt, INTERACTIVE_SELECTOR, isDisabled } from "./measure";
import { frames, mountStory, storyModule } from "./mount";

export { mountStory };

/** Form controls with an indicator (T21a). Other items live in stability-*.test.tsx (suite.tsx). */
export const ITEMS = ["checkbox", "toggle", "radio-group", "switch", "slider", "tabs", "checkbox-group", "toggle-group"] as const;
export const STORIES = ["States", "Default"] as const;

describe("state changes never move or resize a control or its row", () => {
  for (const item of ITEMS) {
    for (const name of STORIES) {
      if (!storyModule(item)?.[name]) continue;
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

describe("tabs indicator", () => {
  test("covers the selected tab through transform only (translate + scale, no left/width transition)", async () => {
    const wrapper = await mountStory("tabs", "Default");
    const indicator = wrapper.querySelector<HTMLElement>('[data-slot="tabs-indicator"]')!;
    const tab = wrapper.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!;
    await frames(3);
    const i = indicator.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    expect(Math.abs(i.x - t.x), "indicator x").toBeLessThan(1);
    expect(Math.abs(i.width - t.width), "indicator width").toBeLessThan(1);
    const props = getComputedStyle(indicator).transitionProperty;
    expect(props).not.toMatch(/left|width/);
    expect(props).toMatch(/translate/);
  });
});
