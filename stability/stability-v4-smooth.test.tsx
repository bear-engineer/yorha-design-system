import { afterEach, describe, expect, it } from "vitest";
import "./mount";
import { frames } from "./mount";

// motion-smooth: nothing the system animates is stepped. Computed animation / transition timing functions of every yorha-* motion utility
// (in each motion mode) contain no `steps(`, and reduced / off keep their contracts.
type Mode = "full" | "reduced" | "off";
const UTILITIES = ["pop", "panel", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "collapse", "wipe", "press", "stagger", "unfold", "glitch", "flicker", "stream"];
const STATES = ["", "data-starting-style", "data-ending-style", "data-open", "data-closed", "data-run"];
const hosts: HTMLElement[] = [];
afterEach(() => hosts.splice(0).forEach((h) => h.remove()));
async function mount(mode: Mode, html: string) {
  const host = document.createElement("div");
  host.dataset.motion = mode;
  host.innerHTML = html;
  document.body.append(host);
  hosts.push(host);
  for (const a of host.getAnimations({ subtree: true })) a.pause();
  await frames(2);
  return host;
}

describe("no stepped timing function in any yorha-* utility", () => {
  for (const mode of ["full", "reduced", "off"] as Mode[]) {
    it(`${mode}: transition and animation timing functions never contain steps(`, async () => {
      const html = UTILITIES.flatMap((u) => STATES.map((state) => `<div class="yorha-${u}" data-text="x" ${state} data-side="bottom">x<span>y</span></div>`)).join("");
      const host = await mount(mode, html);
      const bad: string[] = [];
      for (const el of host.querySelectorAll<HTMLElement>("div, div > span")) {
        for (const pseudo of [undefined, "::before", "::after"]) {
          const style = getComputedStyle(el, pseudo);
          const found = `${style.transitionTimingFunction} | ${style.animationTimingFunction}`;
          if (/steps\(/.test(found)) bad.push(`${el.className} ${el.getAttributeNames().join(" ")} ${pseudo ?? ""}: ${found}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
  it("generated stylesheet text has no steps( and no yorha-dissolve", () => {
    // The caret blink is the one allowed discrete change (step-end serialises as steps(1)).
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((rule) => !rule.includes("yorha-caret"));
    expect(rules.filter((rule) => /steps\(/.test(rule)).map((rule) => rule.slice(0, 120))).toEqual([]);
    const text = rules.join("\n");
    expect(text).not.toContain("yorha-dissolve");
  });
});

describe("components", () => {
  it("reduced: popup transitions are opacity-only in effect (linear), off: zero durations", async () => {
    const reduced = await mount("reduced", `<div class="yorha-pop" data-starting-style></div>`);
    const style = getComputedStyle(reduced.firstElementChild!);
    expect(style.transitionTimingFunction).toBe("linear, linear");
    const off = await mount("off", `<div class="yorha-pop" data-starting-style></div>`);
    expect(getComputedStyle(off.firstElementChild!).transitionDuration).toBe("0s, 0s");
  });
});
