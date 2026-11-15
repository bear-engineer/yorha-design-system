import { createElement, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook annotations + global css
import { frames } from "./mount";
import { Checkbox } from "../registry/yorha/ui/checkbox/checkbox";
import { CheckboxGroup } from "../registry/yorha/ui/checkbox-group/checkbox-group";
import { Radio, RadioGroup } from "../registry/yorha/ui/radio-group/radio-group";
import { Switch } from "../registry/yorha/ui/switch/switch";
import { Slider } from "../registry/yorha/ui/slider/slider";

// v4 f-act-b: V4-105 checkbox glyph + stepped clip, V4-106 radio disc, V4-107 switch pending, V4-108/110 slider fill + bubble + marks,
// V4-109 checkbox-group shift range, V4-111 slider form.

const mounted: { root: Root; host: HTMLElement }[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.host.remove();
  }
});

async function render(ui: ReactElement, motion = "full", width = 320): Promise<HTMLElement> {
  document.documentElement.dataset.motion = motion;
  const host = document.createElement("div");
  host.lang = "ko";
  host.dataset.motion = motion;
  host.style.cssText = `padding:24px;width:${width}px;box-sizing:border-box;background:var(--yorha-bg);color:var(--yorha-fg)`;
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  flushSync(() => root.render(ui));
  await frames(3);
  return host;
}

const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
const rect = (el: Element) => {
  const r = el.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(",");
};
const css = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const isInt = (n: number) => Math.abs(n - Math.round(n)) < 1e-6;

describe("V4-105 checkbox glyph", () => {
  it("check / minus are 12 px glyphs on whole pixels inside a fixed 20 px box; no scale", async () => {
    const host = await render(createElement(Checkbox, { defaultChecked: false }, "알림"));
    const box = q(host, '[data-slot="checkbox-box"]');
    const before = rect(box);
    const glyphs = [...host.querySelectorAll<SVGSVGElement>('svg[data-slot="glyph"]')];
    expect(glyphs.map((g) => g.dataset.glyph).sort()).toEqual(["check", "minus"]);
    for (const g of glyphs) {
      const r = g.getBoundingClientRect();
      expect([r.width, r.height], "12 px glyph").toEqual([12, 12]);
      expect(isInt(r.x) && isInt(r.y), `integer position ${r.x},${r.y}`).toBe(true);
      expect(g.getAttribute("shape-rendering")).toBe("crispEdges");
      expect(css(g).scale).toBe("none");
      expect(css(g).transitionProperty).not.toContain("scale");
    }
    await userEvent.click(q(host, '[role="checkbox"]'));
    await frames(14);
    expect(rect(box), "box rect constant").toBe(before);
  });

  it("checking steps the clip left to right in 4 discrete values; box rect constant", async () => {
    const host = await render(createElement(Checkbox, { defaultChecked: false }, "알림"));
    const box = q(host, '[data-slot="checkbox-box"]');
    const before = rect(box);
    const check = q<SVGSVGElement>(host, 'svg[data-glyph="check"]');
    const hidden = css(check).clipPath;
    await userEvent.click(q(host, '[role="checkbox"]'));
    const anim = check.getAnimations().find((a) => (a as CSSTransition).transitionProperty === "clip-path") as CSSTransition | undefined;
    expect(anim, "clip-path transition runs").toBeDefined();
    anim!.pause();
    const dur = Number(anim!.effect!.getComputedTiming().duration);
    expect(dur).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const t of [0.05, 0.3, 0.55, 0.8]) {
      anim!.currentTime = t * dur;
      seen.add(css(check).clipPath);
      expect(rect(box), "box rect constant mid-run").toBe(before);
      const r = check.getBoundingClientRect();
      expect([r.width, r.height]).toEqual([12, 12]);
    }
    expect(seen.size, `4 discrete clip values: ${[...seen]}`).toBe(4);
    expect(seen.has(hidden), "starts hidden").toBe(true);
    expect(css(check).clipPath, "3/4 open at 0.8").not.toBe(hidden);
    anim!.finish();
  });

  it("reduced: opacity only, the clip never hides; off: instant", async () => {
    const reduced = await render(createElement(Checkbox, { defaultChecked: false }, "알림"), "reduced");
    const check = q<SVGSVGElement>(reduced, 'svg[data-glyph="check"]');
    const cut = (el: Element) => (css(el).clipPath.match(/[\d.]+/g) ?? []).reduce((a, n) => a + parseFloat(n), 0);
    expect(cut(check), "clip open while unchecked").toBe(0);
    await userEvent.click(q(reduced, '[role="checkbox"]'));
    await frames(2);
    expect(cut(check), "clip open after").toBe(0);
    expect(css(check).transitionProperty).toContain("opacity");
    const off = await render(createElement(Checkbox, { defaultChecked: true }, "알림"), "off");
    const g = q<SVGSVGElement>(off, 'svg[data-glyph="check"]');
    expect(css(g).transitionDuration.split(",").every((d) => parseFloat(d) === 0 || d.trim() === "0s")).toBe(true);
  });
});

describe("V4-106 radio disc", () => {
  it("8 px disc glyph in a 12 px box, opacity step, no scale, box constant", async () => {
    const host = await render(createElement(RadioGroup, { "aria-label": "r", defaultValue: "a" }, createElement(Radio, { value: "a" }, "하나"), createElement(Radio, { value: "b" }, "둘")));
    const boxes = [...host.querySelectorAll('[data-slot="radio-box"]')];
    const before = boxes.map(rect);
    const discs = [...host.querySelectorAll<SVGSVGElement>('svg[data-glyph="disc"]')];
    expect(discs.length).toBe(2);
    for (const d of discs) {
      const r = d.getBoundingClientRect();
      expect([r.width, r.height]).toEqual([12, 12]);
      expect(isInt(r.x) && isInt(r.y)).toBe(true);
      expect(d.getAttribute("shape-rendering")).toBe("crispEdges");
      expect(css(d).scale).toBe("none");
      expect(css(d.parentElement!).scale).toBe("none");
      expect(css(d.parentElement!).transitionProperty).not.toContain("scale");
    }
    expect(css(discs[0]!.parentElement!).opacity).toBe("1");
    expect(css(discs[1]!.parentElement!).opacity).toBe("0");
    await userEvent.click(q(host, '[role="radio"]:not([data-checked])'));
    await frames(14);
    expect(boxes.map(rect)).toEqual(before);
    expect(css(discs[1]!.parentElement!).opacity).toBe("1");
  });
});

describe("V4-107 switch pending", () => {
  it("aria-busy, data-pending, clicks ignored, track and thumb rects constant, mark is 4 px", async () => {
    const onChange = vi.fn();
    const host = await render(createElement(Switch, { pending: true, defaultChecked: false, onCheckedChange: onChange }, "동기화"));
    const sw = q(host, '[role="switch"]');
    const track = q(host, '[data-slot="switch-track"]');
    const thumb = q(host, '[data-slot="switch-thumb"]');
    const rects = [rect(track), rect(thumb)];
    expect(sw.getAttribute("aria-busy")).toBe("true");
    expect(sw.hasAttribute("data-pending")).toBe(true);
    const mark = q(thumb, '[data-slot="switch-pending-mark"]');
    const m = mark.getBoundingClientRect();
    expect([m.width, m.height]).toEqual([4, 4]);
    expect(isInt(m.x) && isInt(m.y)).toBe(true);
    await userEvent.click(sw);
    await userEvent.keyboard(" ");
    await frames(14);
    expect(onChange).not.toHaveBeenCalled();
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect([rect(track), rect(thumb)]).toEqual(rects);
    expect(css(thumb).scale).toBe("none");
  });

  it("pending flips between two states; idle mark is hidden; rects equal across pending", async () => {
    function Harness() {
      const [p, setP] = useState(false);
      return createElement("div", null, createElement("button", { id: "go", onClick: () => setP((v) => !v) }, "go"), createElement(Switch, { pending: p }, "동기화"));
    }
    const host = await render(createElement(Harness));
    const track = q(host, '[data-slot="switch-track"]');
    const thumb = q(host, '[data-slot="switch-thumb"]');
    const mark = q(thumb, '[data-slot="switch-pending-mark"]');
    const rects = [rect(track), rect(thumb)];
    expect(css(mark).opacity).toBe("0");
    expect(q(host, '[role="switch"]').hasAttribute("aria-busy")).toBe(false);
    q<HTMLButtonElement>(host, "#go").click();
    await frames(4);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      seen.add(css(mark).opacity);
      await new Promise((r) => setTimeout(r, 40));
    }
    expect(seen.size, `two-state pulse ${[...seen]}`).toBe(2);
    expect([rect(track), rect(thumb)]).toEqual(rects);
  });
});

describe("V4-108/110 slider", () => {
  it("the fill ends at the thumb centre for values 0..100 step 7", async () => {
    function S({ v }: { v: number }) {
      return createElement(Slider, { label: "볼륨", value: v, onValueChange: () => {} });
    }
    const host = await render(createElement(S, { v: 0 }), "full", 360);
    const root = mounted[mounted.length - 1]!.root;
    for (let v = 0; v <= 100; v += 7) {
      flushSync(() => root.render(createElement(S, { v })));
      await frames(2);
      const fill = q(host, '[data-slot="slider-fill"]').getBoundingClientRect();
      const thumb = q(host, '[data-slot="slider-thumb"]').getBoundingClientRect();
      const centre = thumb.x + thumb.width / 2;
      expect(Math.abs(centre - (fill.x + fill.width)), `value ${v}: thumb ${centre} fill end ${fill.x + fill.width}`).toBeLessThanOrEqual(1);
    }
  });

  it("formatValue feeds aria-valuetext, the readout and the bubble; bubble shows on focus-visible without moving anything", async () => {
    const host = await render(createElement(Slider, { label: "볼륨", defaultValue: 42, showValue: true, formatValue: (v: number) => `${v}%` }));
    const input = q<HTMLInputElement>(host, 'input[type="range"]');
    expect(input.getAttribute("aria-valuetext")).toBe("42%");
    expect(q(host, '[data-slot="slider-readout"]').textContent).toBe("42%");
    const thumb = q(host, '[data-slot="slider-thumb"]');
    const bubble = q(thumb, '[data-slot="slider-bubble"]');
    expect(css(bubble).opacity).toBe("0");
    const before = [rect(thumb), rect(q(host, '[data-slot="slider-track"]')), rect(q(host, '[data-slot="slider-control"]'))];
    await userEvent.tab();
    await frames(8);
    expect(css(bubble).opacity).toBe("1");
    expect(bubble.textContent).toBe("42%");
    expect(css(bubble).position).not.toBe("static");
    expect(bubble.getBoundingClientRect().bottom, "above the thumb").toBeLessThanOrEqual(thumb.getBoundingClientRect().top + 1);
    await userEvent.keyboard("{ArrowRight}");
    await frames(2);
    expect(bubble.textContent).toBe("43%");
    expect(input.getAttribute("aria-valuetext")).toBe("43%");
    expect([rect(thumb), rect(q(host, '[data-slot="slider-track"]')), rect(q(host, '[data-slot="slider-control"]'))]).toEqual(before.map((b, i) => (i === 0 ? rect(thumb) : b)));
  });

  it("marks sit at their value on the track axis", async () => {
    const host = await render(
      createElement(Slider, { label: "밝기", defaultValue: 50, marks: [{ value: 0, label: "0" }, { value: 50, label: "50" }, { value: 100, label: "100" }] }),
      "full",
      360,
    );
    const track = q(host, '[data-slot="slider-track"]').getBoundingClientRect();
    const ticks = [...host.querySelectorAll('[data-slot="slider-mark"]')].map((t) => t.getBoundingClientRect());
    expect(ticks.length).toBe(3);
    const centres = ticks.map((t) => t.x + t.width / 2);
    expect(centres[0]).toBeCloseTo(track.x, 0);
    expect(centres[1]).toBeCloseTo(track.x + track.width / 2, 0);
    expect(centres[2]).toBeCloseTo(track.x + track.width, 0);
    for (const t of ticks) expect(isInt(t.x) && isInt(t.width), "integer px").toBe(true);
  });
});

describe("V4-111 slider form", () => {
  it("FormData carries name; form reset returns to the default", async () => {
    const host = await render(
      createElement("form", { id: "f" }, createElement(Slider, { label: "볼륨", name: "vol", defaultValue: 30 }), createElement("button", { type: "reset", id: "rs" }, "reset")),
    );
    const form = q<HTMLFormElement>(host, "#f");
    expect(new FormData(form).get("vol")).toBe("30");
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await frames(2);
    expect(new FormData(form).get("vol")).toBe("32");
    form.reset();
    await frames(4);
    expect(new FormData(form).get("vol")).toBe("30");
    expect(q<HTMLInputElement>(host, 'input[type="range"]').getAttribute("aria-valuenow")).toBe("30");
  });
});

describe("V4-109 checkbox group range", () => {
  it("click 1, Shift+click 4 checks 1-4; a plain click afterwards toggles one", async () => {
    const host = await render(
      createElement(CheckboxGroup, { "aria-label": "g", defaultValue: [] }, ...["a", "b", "c", "d", "e"].map((v, i) => createElement(Checkbox, { key: v, value: v }, `항목 ${i + 1}`))),
    );
    const boxes = () => [...host.querySelectorAll('[role="checkbox"]')];
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard("{Shift>}");
    await userEvent.click(boxes()[3]!);
    await userEvent.keyboard("{/Shift}");
    await frames(2);
    expect(boxes().map((b) => b.getAttribute("aria-checked"))).toEqual(["true", "true", "true", "true", "false"]);
    await userEvent.click(boxes()[4]!);
    expect(boxes().map((b) => b.getAttribute("aria-checked"))).toEqual(["true", "true", "true", "true", "true"]);
  });
});
