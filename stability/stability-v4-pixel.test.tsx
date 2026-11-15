import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";
import { Glyph } from "../registry/yorha/ui/glyph/glyph";
import { GLYPH_NAMES } from "../registry/yorha/ui/glyph/glyphs";
import * as icons from "../registry/yorha/ui/icons/icons";
import { Ornament } from "../registry/yorha/ui/ornament/ornament";
import { Spinner } from "../registry/yorha/ui/spinner/spinner";
import { Skeleton, SkeletonGroup } from "../registry/yorha/ui/skeleton/skeleton";

// v4 g-pixel (V4-030..034): glyph cells sit on integer pixels, crispEdges, no fractional transforms, two colours at integer DPR.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode, motion = "full", css = ""): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.dataset.motion = motion;
  document.documentElement.dataset.motion = motion; // Spinner / Skeleton read the root attribute
  host.style.cssText = `position:absolute;left:8px;top:8px;width:400px;color:#000;background:#fff;${css}`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(2);
  return host;
}

const isInt = (n: number) => Math.abs(n - Math.round(n)) < 1e-6;

/** Distinct (r,g,b,a) values of an svg drawn at an integer CSS size into a canvas of size*dpr device px. */
async function colours(svg: SVGSVGElement, dpr: number): Promise<number> {
  const w = Number(svg.getAttribute("width")) * dpr;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.style.color = "#000";
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(w));
  const url = URL.createObjectURL(new Blob([clone.outerHTML], { type: "image/svg+xml" }));
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("svg load"));
    img.src = url;
  });
  const c = document.createElement("canvas");
  c.width = c.height = w;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, w);
  URL.revokeObjectURL(url);
  const data = ctx.getImageData(0, 0, w, w).data;
  const seen = new Set<number>();
  for (let i = 0; i < data.length; i += 4) seen.add(data[i + 3]! > 127 ? 1 : data[i + 3] === 0 ? 0 : 2);
  return seen.size === 2 && !seen.has(2) ? 2 : seen.size + (seen.has(2) ? 10 : 0);
}

describe("Glyph (V4-030)", () => {
  it("every glyph at scale 1 and 2: integer box, crispEdges, no transform, integer position", async () => {
    const host = await mount(
      createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, ...GLYPH_NAMES.flatMap((name) => [1, 2].map((scale) => createElement(Glyph, { key: `${name}${scale}`, name, scale: scale as 1 | 2 })))),
    );
    const svgs = [...host.querySelectorAll<SVGSVGElement>("svg[data-slot=glyph]")];
    expect(svgs.length).toBe(GLYPH_NAMES.length * 2);
    for (const svg of svgs) {
      const cs = getComputedStyle(svg);
      const r = svg.getBoundingClientRect();
      expect(cs.shapeRendering.toLowerCase(), svg.dataset.glyph).toBe("crispedges");
      expect(cs.transform).toBe("none");
      expect(isInt(r.width) && isInt(r.height) && isInt(r.left) && isInt(r.top), `${svg.dataset.glyph} ${JSON.stringify(r)}`).toBe(true);
      expect(r.width).toBe(Number(svg.getAttribute("width")));
      for (const p of svg.querySelectorAll("path")) expect(p.getAttribute("d")).not.toMatch(/\./);
    }
  });

  it("two colours only (ink and nothing) at DPR 1 and 2 raster sizes", async () => {
    const host = await mount(createElement("div", null, ...GLYPH_NAMES.map((name) => createElement(Glyph, { key: name, name }))));
    for (const svg of host.querySelectorAll<SVGSVGElement>("svg[data-slot=glyph]"))
      for (const dpr of [1, 2]) expect(await colours(svg, dpr), `${svg.dataset.glyph}@${dpr}x`).toBe(2);
  });
});

describe("icons on Glyph (V4-031)", () => {
  const entries = Object.entries(icons).filter(([n, c]) => /Icon$/.test(n) && typeof c === "function") as [string, React.ComponentType<Record<string, unknown>>][];
  it("no icon carries a stroke; every one is a crisp two-colour glyph", async () => {
    const host = await mount(createElement("div", null, ...entries.map(([n, C]) => createElement(C, { key: n }))));
    const svgs = [...host.querySelectorAll<SVGSVGElement>("svg")];
    expect(svgs.length).toBe(entries.length);
    for (const svg of svgs) {
      expect(svg.outerHTML).not.toMatch(/\sstroke/);
      expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
      expect(await colours(svg, 1), svg.outerHTML.slice(0, 80)).toBe(2);
    }
  });
});

describe("Ornament (V4-034)", () => {
  it("no rotate / transform on any part; diamond is a glyph; band stays a fixed 12 px box", async () => {
    const host = await mount(createElement("div", null, createElement(Ornament, { variant: "band" }), createElement(Ornament, { variant: "separator" })));
    const parts = [...host.querySelectorAll<HTMLElement>("[data-slot=ornament], [data-slot=ornament] *")];
    expect(parts.length).toBeGreaterThan(2);
    for (const el of parts) expect(getComputedStyle(el).transform, el.outerHTML.slice(0, 60)).toBe("none");
    const band = host.querySelector<HTMLElement>("[data-slot=ornament]")!;
    expect(band.getBoundingClientRect().height).toBe(12);
    const g = band.querySelector<SVGSVGElement>("svg[data-slot=glyph]")!;
    expect(g.dataset.glyph).toBe("diamond");
    const r = g.getBoundingClientRect();
    expect(isInt(r.left) && isInt(r.top)).toBe(true);
    expect(await colours(g, 1)).toBe(2);
  });
});

describe("Spinner (V4-032)", () => {
  it("12 px box, 8 integer 2 px dots on a 3x3 perimeter, <= 2 toggles per cycle, off = static 3 lit", async () => {
    const host = await mount(createElement(Spinner, { label: "x" }));
    const el = host.querySelector<HTMLElement>("[data-slot=spinner]")!;
    const r = el.getBoundingClientRect();
    expect([r.width, r.height]).toEqual([12, 12]);
    const dots = [...el.querySelectorAll<HTMLElement>("[data-yorha-dot]")];
    expect(dots.length).toBe(8);
    for (const d of dots) {
      const b = d.getBoundingClientRect();
      expect([b.width, b.height]).toEqual([2, 2]);
      expect(isInt(b.left) && isInt(b.top), JSON.stringify(b)).toBe(true);
    }
    expect(new Set(dots.map((d) => `${d.getBoundingClientRect().left}:${d.getBoundingClientRect().top}`)).size).toBe(8);
    const anims = el.getAnimations({ subtree: true });
    expect(anims.length).toBe(8);
    for (const a of anims) {
      const frames = (a.effect as KeyframeEffect).getKeyframes().map((k) => Number(k.opacity));
      let toggles = 0;
      for (let i = 1; i < frames.length; i++) if (frames[i] !== frames[i - 1]) toggles++;
      expect(toggles).toBeLessThanOrEqual(2);
      expect(String((a.effect as KeyframeEffect).getKeyframes()[0]!.easing)).toMatch(/steps\(1/);
    }
  });
  it("off: no animation, three lit dots", async () => {
    const host = await mount(createElement(Spinner), "off");
    const el = host.querySelector<HTMLElement>("[data-slot=spinner]")!;
    await frames(2);
    expect(el.getAnimations({ subtree: true }).length).toBe(0);
    const lit = [...el.querySelectorAll<HTMLElement>("[data-yorha-dot]")].filter((d) => Number(getComputedStyle(d).opacity) === 1);
    expect(lit.length).toBe(3);
  });
});

describe("Skeleton (V4-033)", () => {
  it("scan uses the loop steps; one status per SkeletonGroup", async () => {
    const host = await mount(createElement(SkeletonGroup, { label: "대시보드 로딩 중" }, createElement(Skeleton, { className: "h-4 w-20" }), createElement(Skeleton, { className: "h-4 w-20" })));
    expect(host.querySelectorAll("[role=status]").length).toBe(1);
    const shimmers = [...host.querySelectorAll<HTMLElement>("[data-yorha-shimmer]")];
    expect(shimmers.length).toBe(2);
    for (const s of shimmers) {
      const a = s.getAnimations()[0]!;
      expect(String((a.effect as KeyframeEffect).getTiming().easing)).toContain("steps(16");
    }
    expect(host.querySelector("[data-slot=skeleton]")!.getAttribute("role")).toBe("presentation");
  });
});
