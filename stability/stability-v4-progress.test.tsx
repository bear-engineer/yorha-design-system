import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";
import { Progress } from "../registry/yorha/ui/progress/progress";
import { Meter } from "../registry/yorha/ui/meter/meter";
import { Spinner } from "../registry/yorha/ui/spinner/spinner";
import { Skeleton } from "../registry/yorha/ui/skeleton/skeleton";

// v4 progress craft pass: whole-cell geometry, hard fill boundary, aligned label/value, no rect change, smooth (never stepped) motion.

const roots: ReturnType<typeof createRoot>[] = [];
const hosts: HTMLElement[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rect = (el: Element) => el.getBoundingClientRect();
const key = (el: Element) => {
  const b = rect(el);
  return `${b.left}/${b.top}/${b.width}/${b.height}`;
};
const isInt = (n: number) => Math.abs(n - Math.round(n)) < 1e-6;

async function mount(node: React.ReactNode, { motion = "off", width = 337 } = {}) {
  document.documentElement.dataset.motion = motion;
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:8px;top:8px;width:${width}px;color:#000;background:#fff;`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return {
    host,
    rerender: async (n: React.ReactNode) => {
      flushSync(() => root.render(n));
      await frames(2);
    },
  };
}

const q = (host: HTMLElement, slot: string) => host.querySelector<HTMLElement>(`[data-slot=${slot}]`)!;
const anims = (host: HTMLElement) => host.getAnimations({ subtree: true });
const kf = (a: Animation) => (a.effect as KeyframeEffect).getKeyframes();
const easingOf = (a: Animation) => String(a.effect!.getTiming().easing);

/** Visible width of the fill = cells-area width minus the right inset of its clip-path. */
function visibleFill(host: HTMLElement): number {
  const fill = q(host, "progress-fill");
  const cells = q(host, "progress-cells");
  const m = /inset\(([^)]*)\)/.exec(getComputedStyle(fill).clipPath);
  expect(m, getComputedStyle(fill).clipPath).toBeTruthy();
  const parts = m![1]!.split(/\s+/).map(parseFloat);
  const right = parts.length === 1 ? parts[0]! : parts[1]!;
  return rect(cells).width - right;
}

describe("Progress geometry", () => {
  for (const width of [337, 480, 301]) {
    it(`track is whole cells + 6px chrome at width ${width}; every rect is integer`, async () => {
      const { host } = await mount(<Progress label="전송" value={62} />, { width });
      const track = q(host, "progress-track");
      const cells = q(host, "progress-cells");
      expect((rect(track).width - 6) % 8, `track ${rect(track).width}`).toBe(0);
      expect(rect(track).width).toBeLessThanOrEqual(width);
      expect(width - rect(track).width).toBeLessThan(8); // at most one cell of slack
      expect(rect(cells).width % 8).toBe(0);
      expect(rect(track).height).toBe(14);
      expect(rect(cells).height).toBe(8);
      // text boxes (label, value) have glyph-driven widths; every structural box is integer
      for (const el of [host, q(host, "progress-row"), track, cells, q(host, "progress-ghost"), q(host, "progress-fill")]) {
        const b = rect(el);
        if (b.width === 0 && b.height === 0) continue;
        expect(isInt(b.left) && isInt(b.top) && isInt(b.width) && isInt(b.height), `${el.tagName}.${el.getAttribute("data-slot")} ${key(el)}`).toBe(true);
      }
    });
  }

  it("sm: 10px track, 4px cells on a 6px pitch", async () => {
    const { host } = await mount(<Progress label="x" value={50} size="sm" />, { width: 300 });
    const track = q(host, "progress-track");
    expect(rect(track).height).toBe(10);
    expect((rect(track).width - 6) % 6).toBe(0);
    expect(rect(q(host, "progress-cells")).height).toBe(4);
  });

  it("the label row and the track share left and right edges", async () => {
    const { host } = await mount(<Progress label="전송" value={62} />);
    const row = q(host, "progress-row");
    expect(rect(row).left).toBe(rect(q(host, "progress-track")).left);
    expect(rect(row).right).toBe(rect(q(host, "progress-track")).right);
  });

  for (const value of [0, 1, 25, 37, 62, 99, 100]) {
    it(`fill boundary is a cell boundary: value ${value} -> round(value) cells (min 1 when > 0)`, async () => {
      const { host } = await mount(<Progress label="x" value={value} />);
      const cells = rect(q(host, "progress-cells")).width / 8;
      const expected = value === 0 ? 0 : Math.max(1, Math.round((value / 100) * cells));
      expect(visibleFill(host)).toBe(expected * 8);
    });
  }

  it("empty cells are 2px hairline ticks, filled cells are 8px solid: both drawn with a cell mask, not two greys", async () => {
    const { host } = await mount(<Progress label="x" value={40} />);
    const fill = getComputedStyle(q(host, "progress-cells"));
    expect(fill.maskImage).toContain("linear-gradient");
    expect(fill.maskSize).toMatch(/^8px/);
    const ghost = q(host, "progress-ghost");
    expect(rect(ghost).height).toBe(2);
    expect(getComputedStyle(ghost).maskSize).toMatch(/^8px/);
    expect(getComputedStyle(q(host, "progress-fill")).backgroundColor).not.toBe(getComputedStyle(ghost).backgroundColor);
  });

  it("ticks at 25/50/75 snap to cell boundaries and sit in the frame padding", async () => {
    const { host } = await mount(<Progress label="x" value={10} ticks />);
    const ticks = [...host.querySelectorAll<HTMLElement>("[data-slot=progress-tick]")];
    expect(ticks.length).toBe(3);
    const base = rect(q(host, "progress-cells")).left;
    for (const t of ticks) {
      expect((rect(t).left + 2 - base) % 8).toBe(0);
      expect(rect(t).top).toBeLessThan(rect(q(host, "progress-cells")).top);
    }
  });
});

describe("Progress label / value", () => {
  it("label and value share one baseline and the row is 16px; value is tabular and never moves the label", async () => {
    const { host, rerender } = await mount(<Progress label="전송" value={8} />);
    const label = host.querySelector("[id]") ? q(host, "progress-label") : q(host, "progress-label");
    const value = q(host, "progress-value");
    const baseline = (el: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const b = range.getBoundingClientRect();
      return b.bottom;
    };
    expect(rect(q(host, "progress-row")).height).toBe(16);
    expect(baseline(label)).toBe(baseline(value));
    expect(getComputedStyle(value).fontVariantNumeric).toContain("tabular-nums");
    const before = key(label);
    await rerender(<Progress label="전송" value={100} />);
    expect(key(label)).toBe(before);
    expect(key(q(host, "progress-row"))).toBe(`${rect(q(host, "progress-row")).left}/${rect(q(host, "progress-row")).top}/${rect(q(host, "progress-row")).width}/16`);
  });
});

describe("Progress layout stability", () => {
  it("no rect changes across value, status, indeterminate and size-neutral states", async () => {
    const snap = (host: HTMLElement) => ["progress-row", "progress-label", "progress-track", "progress-cells", "progress-ghost", "progress-fill"].map((s) => key(q(host, s))).join("|");
    const { host, rerender } = await mount(<Progress label="전송" value={10} />);
    const base = snap(host);
    for (const node of [
      <Progress label="전송" value={73} />,
      <Progress label="전송" value={100} />,
      <Progress label="전송" value={40} status="error" />,
      <Progress label="전송" value={40} status="paused" />,
      <Progress label="전송" value={null} />,
      <Progress label="전송" value={40} ticks />,
    ]) {
      await rerender(node);
      expect(snap(host)).toBe(base);
    }
  });

  it("status maps to data-status, with the alert colour for error and a 4px fill for paused", async () => {
    const { host, rerender } = await mount(<Progress label="x" value={40} status="error" />);
    expect(host.querySelector("[role=progressbar]")!.getAttribute("data-status")).toBe("error");
    const err = getComputedStyle(q(host, "progress-fill")).backgroundColor;
    await rerender(<Progress label="x" value={40} />);
    expect(getComputedStyle(q(host, "progress-fill")).backgroundColor).not.toBe(err);
    await rerender(<Progress label="x" value={40} status="paused" />);
    expect(rect(q(host, "progress-fill")).height).toBe(8); // the box never resizes; the mask draws the 4px cells
    expect(getComputedStyle(q(host, "progress-cells")).maskSize).toMatch(/^8px/);
    expect(host.querySelector("[role=progressbar]")!.getAttribute("data-status")).toBe("paused");
  });
});

describe("Progress motion (smooth, never stepped)", () => {
  it("determinate increase: one clip-path animation, 240ms, --yorha-ease-out (smooth ease-out), not steps", async () => {
    const { host, rerender } = await mount(<Progress label="x" value={20} />, { motion: "full" });
    await wait(400);
    await rerender(<Progress label="x" value={70} />);
    const running = anims(host).filter((a) => kf(a).some((k) => "clipPath" in k));
    expect(running.length).toBe(1);
    expect(running[0]!.effect!.getTiming().duration).toBe(240);
    const token = getComputedStyle(document.documentElement).getPropertyValue("--yorha-ease-out").trim();
    expect(easingOf(running[0]!)).toBe(token.replace(/,\s*/g, ", "));
    expect(easingOf(running[0]!)).toMatch(/^cubic-bezier\(/);
    await wait(350);
    expect(visibleFill(host) % 8).toBe(0); // the rest state still lands on a cell boundary
  });

  it("indeterminate: a linear translateX sweep of 1200-1600ms loops forever", async () => {
    const { host } = await mount(<Progress label="x" value={null} />, { motion: "full" });
    const list = anims(host);
    expect(list.length).toBe(1);
    const a = list[0]!;
    expect(kf(a).some((k) => "transform" in k)).toBe(true);
    expect(easingOf(a)).not.toMatch(/steps/);
    expect(a.effect!.getTiming().duration as number).toBeGreaterThanOrEqual(1200);
    expect(a.effect!.getTiming().duration as number).toBeLessThanOrEqual(1600);
    expect(a.effect!.getTiming().iterations).toBe(Infinity);
    // smooth: 2 keyframes only, no discrete jumps
    expect(kf(a).length).toBe(2);
  });

  it("reduced: opacity only; off: nothing animates", async () => {
    const red = await mount(<Progress label="x" value={null} />, { motion: "reduced" });
    const list = anims(red.host);
    expect(list.length).toBe(1);
    expect(kf(list[0]!).every((k) => !("transform" in k) && !("clipPath" in k))).toBe(true);
    expect(kf(list[0]!).some((k) => "opacity" in k)).toBe(true);
    await red.rerender(<Progress label="x" value={30} />);
    await red.rerender(<Progress label="x" value={80} />);
    expect(anims(red.host).filter((a) => kf(a).some((k) => "clipPath" in k)).length).toBe(0);
    const off = await mount(<Progress label="x" value={null} />, { motion: "off" });
    expect(anims(off.host).length).toBe(0);
    await off.rerender(<Progress label="x" value={30} />);
    await off.rerender(<Progress label="x" value={80} />);
    expect(anims(off.host).length).toBe(0);
  });

  it("indeterminate keeps the static aria contract and no aria-valuenow", async () => {
    const { host } = await mount(<Progress label="x" value={null} />, { motion: "full" });
    const bar = host.querySelector("[role=progressbar]")!;
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
  });
});

describe("Meter", () => {
  it("same chrome as Progress; thresholds are notches in the frame padding, not only colour", async () => {
    const ok = await mount(<Meter label="HP" value={120} max={150} low={30} critical={10} />);
    const low = await mount(<Meter label="HP" value={25} max={150} low={30} critical={10} />);
    const crit = await mount(<Meter label="HP" value={6} max={150} low={30} critical={10} />);
    for (const m of [ok, low, crit]) {
      expect(rect(q(m.host, "meter-track")).height).toBe(14);
      expect((rect(q(m.host, "meter-track")).width - 6) % 8).toBe(0);
      expect(m.host.querySelectorAll("[data-slot=meter-notch]").length).toBe(2);
    }
    const fillOf = (h: HTMLElement) => getComputedStyle(q(h, "meter-fill")).backgroundColor;
    expect(fillOf(crit.host)).not.toBe(fillOf(ok.host));
    expect(low.host.querySelector("[data-low]")).toBeTruthy();
    expect(ok.host.querySelector("[data-low]")).toBeFalsy();
    expect(crit.host.querySelector("[data-critical]")).toBeTruthy();
    // fill boundary is a whole cell, equal to round(value) cells
    const cells = rect(q(ok.host, "meter-cells")).width / 8;
    const m = /inset\(([^)]*)\)/.exec(getComputedStyle(q(ok.host, "meter-fill")).clipPath)!;
    const right = parseFloat(m[1]!.split(/\s+/)[1] ?? m[1]!);
    expect(rect(q(ok.host, "meter-cells")).width - right).toBe(Math.round((120 / 150) * cells) * 8);
  });

  it("no rect change across value/threshold states; value reads value/max in tabular numerals on the label baseline", async () => {
    const snap = (h: HTMLElement) => ["meter-track", "meter-cells"].map((s) => key(q(h, s))).join("|");
    const { host, rerender } = await mount(<Meter label="HP" value={120} max={150} low={30} critical={10} />);
    const base = snap(host);
    await rerender(<Meter label="HP" value={8} max={150} low={30} critical={10} />);
    expect(snap(host)).toBe(base);
    const label = q(host, "meter-label");
    const value = q(host, "meter-value");
    const bottom = (el: HTMLElement) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().bottom;
    };
    expect(bottom(label)).toBe(bottom(value));
    expect(getComputedStyle(value).fontVariantNumeric).toContain("tabular-nums");
  });
});

describe("Spinner", () => {
  it("full: 8 dots, each a linear opacity trail with a staggered delay; no steps; 12px box and integer dots", async () => {
    const { host } = await mount(createElement(Spinner, { label: "x" }), { motion: "full" });
    const el = host.querySelector<HTMLElement>("[data-slot=spinner]")!;
    expect([rect(el).width, rect(el).height]).toEqual([12, 12]);
    const list = anims(el);
    expect(list.length).toBe(8);
    const delays = new Set<number>();
    for (const a of list) {
      expect(kf(a).every((k) => !("transform" in k))).toBe(true);
      expect(kf(a).some((k) => "opacity" in k)).toBe(true);
      expect(easingOf(a)).toBe("linear");
      for (const k of kf(a)) expect(String(k.easing ?? "linear")).not.toMatch(/steps/);
      delays.add(Number(a.effect!.getTiming().delay));
    }
    expect(delays.size).toBe(8);
  });

  it("reduced: one opacity pulse; off: no animation, static trail", async () => {
    const red = await mount(createElement(Spinner), { motion: "reduced" });
    expect(anims(red.host).length).toBe(1);
    const off = await mount(createElement(Spinner), { motion: "off" });
    expect(anims(off.host).length).toBe(0);
  });
});

describe("Skeleton", () => {
  it("full: one linear translateX shimmer (no steps); reduced: opacity only; off: static", async () => {
    const full = await mount(createElement(Skeleton, { className: "h-4 w-40" }), { motion: "full" });
    const s = full.host.querySelector<HTMLElement>("[data-yorha-shimmer]")!;
    const a = s.getAnimations()[0]!;
    expect(kf(a).some((k) => "transform" in k)).toBe(true);
    expect(String(kf(a)[0]!.transform)).toContain("translateX");
    expect(easingOf(a)).toBe("linear");
    expect(a.effect!.getTiming().duration as number).toBeGreaterThanOrEqual(1200);
    const red = await mount(createElement(Skeleton, { className: "h-4 w-40" }), { motion: "reduced" });
    const ra = red.host.querySelector<HTMLElement>("[data-yorha-shimmer]")!.getAnimations()[0]!;
    expect(kf(ra).every((k) => !("transform" in k))).toBe(true);
    const off = await mount(createElement(Skeleton, { className: "h-4 w-40" }), { motion: "off" });
    expect(off.host.querySelector<HTMLElement>("[data-yorha-shimmer]")!.getAnimations().length).toBe(0);
  });
});
