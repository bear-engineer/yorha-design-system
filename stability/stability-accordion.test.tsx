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
      // headless rAF can stretch to 100ms+ on a loaded machine: also sample on a timer so a 120ms collapse is never seen in one step
      await Promise.race([frame(), wait(8)]);
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
  // V4-182: frame polling flaked once under load (1 of 3 runs). Drive the transition through getAnimations()/currentTime instead: deterministic.
  try {
    const { root, triggers } = await setup("full");
    const open = triggers[0]!;
    const panel = root.querySelector<HTMLElement>("[data-slot=accordion-panel]")!;
    const full = panel.getBoundingClientRect().height;
    expect(full).toBeGreaterThan(8);
    const y0 = open.getBoundingClientRect().y;
    await userEvent.click(open); // close
    await frame();
    const anim = panel.getAnimations().find((a) => (a as CSSTransition).transitionProperty === "height") as CSSTransition | undefined;
    expect(anim, "no height transition on the panel").toBeDefined();
    const total = Number(anim!.effect!.getComputedTiming().endTime);
    expect(total).toBeGreaterThan(100);
    anim!.pause();
    const seen: number[] = [];
    for (const f of [0.05, 0.15, 0.4]) {
      anim!.currentTime = total * f;
      seen.push(panel.getBoundingClientRect().height);
      expect(Math.abs(open.getBoundingClientRect().y - y0), "clicked trigger moved").toBeLessThan(0.5);
    }
    expect(seen.every((h) => h > 0.05 && h < full - 0.5), `not intermediate: ${seen.join(",")}`).toBe(true);
    expect(seen[0]! > seen[1]! && seen[1]! > seen[2]!, `closing must shrink monotonically: ${seen.join(",")}`).toBe(true);
    anim!.finish();
    await wait(50);
    expect(panel.getBoundingClientRect().height).toBeLessThan(1);
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
