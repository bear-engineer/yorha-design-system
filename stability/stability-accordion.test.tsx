import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { mountStory } from "./mount";

const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Heights of a panel sampled every frame while `action` runs. */
async function heights(panel: HTMLElement, trigger: HTMLElement, action: () => Promise<void>) {
  const hs: number[] = [];
  const ys: number[] = [];
  let run = true;
  const loop = (async () => {
    while (run) {
      hs.push(panel.getBoundingClientRect().height);
      ys.push(trigger.getBoundingClientRect().y);
      await frame();
    }
  })();
  await action();
  await wait(500);
  run = false;
  await loop;
  return { hs, ys };
}

async function setup(motion: "full" | "reduced") {
  const root = await mountStory("accordion", "States", { stage: "top" });
  document.documentElement.setAttribute("data-motion", motion);
  await frame();
  const triggers = [...root.querySelectorAll<HTMLElement>("[data-slot=accordion-trigger]")];
  return { root, triggers };
}

test("accordion: panel height animates smoothly, clicked trigger stays put (full motion)", async () => {
  try {
    const { root, triggers } = await setup("full");
    const open = triggers[0]!;
    const panel = root.querySelector<HTMLElement>("[data-slot=accordion-panel]")!;
    const full = panel.getBoundingClientRect().height;
    expect(full).toBeGreaterThan(8);
    const { hs, ys } = await heights(panel, open, () => userEvent.click(open));
    const mid = hs.filter((h) => h > 1 && h < full - 1);
    expect(mid.length, `no intermediate heights: ${hs.join(",")}`).toBeGreaterThan(1);
    expect(Math.min(...hs)).toBeLessThan(1);
    expect(Math.max(...ys) - Math.min(...ys), "clicked trigger moved").toBeLessThan(0.5);
  } finally {
    document.documentElement.removeAttribute("data-motion");
  }
});

test("accordion: reduced motion has no height motion", async () => {
  try {
    const { root, triggers } = await setup("reduced");
    const open = triggers[0]!;
    const panel = root.querySelector<HTMLElement>("[data-slot=accordion-panel]")!;
    const full = panel.getBoundingClientRect().height;
    const { hs } = await heights(panel, open, () => userEvent.click(open));
    expect(hs.filter((h) => h > 1 && h < full - 1), `reduced produced intermediate heights: ${hs.join(",")}`).toEqual([]);
  } finally {
    document.documentElement.removeAttribute("data-motion");
  }
});
