import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Glyph, GLYPH_NAMES, glyphPath, rasterize } from "./glyph";
import { GLYPHS, glyphGrid, nativeBox } from "./glyphs";
import { rows } from "./glyph-core";

const rects = (d: string) => [...d.matchAll(/M(-?\d+) (-?\d+)h(-?\d+)v(-?\d+)h(-?\d+)Z/g)].map((m) => m.slice(1).map(Number) as [number, number, number, number, number]);

describe("glyph (V4-030)", () => {
  it("exports the P0 set", () => {
    for (const n of ["check", "cross", "plus", "minus", "chevron-up", "triangle-left", "sort", "grip", "calendar", "clock", "search", "eye", "eye-off", "diamond", "diamond-ring", "diamond-dot", "diamond-target", "square", "square-x", "disc", "ring", "alert", "info", "lock", "copy", "dots", "arrow-up", "arrow-right"])
      expect(GLYPH_NAMES).toContain(n);
  });

  for (const name of GLYPH_NAMES) {
    for (const box of [12, 16, 20] as const) {
      if (box < nativeBox(name)) continue;
      it(`${name}@${box}: integer rects inside the box, non-empty`, () => {
        const r = rects(glyphPath(name, box));
        expect(r.length).toBeGreaterThan(0);
        for (const [x, y, w, h, nw] of r) {
          expect(w).toBeGreaterThan(0);
          expect(h).toBeGreaterThan(0);
          expect(nw).toBe(-w);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x + w).toBeLessThanOrEqual(box);
          expect(y + h).toBeLessThanOrEqual(box);
        }
        expect(glyphPath(name, box)).not.toMatch(/\./);
      });
    }
  }

  it("rejects a box smaller than the native one", () => {
    expect(() => glyphPath("calendar", 12)).toThrow();
  });

  it("renders a decorative crisp svg at integer scale", () => {
    const html = renderToStaticMarkup(createElement(Glyph, { name: "check", scale: 2 }));
    expect(html).toContain('width="24"');
    expect(html).toContain('viewBox="0 0 12 12"');
    expect(html).toContain('shape-rendering="crispEdges"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/stroke|transform/);
  });

  it("rasterize honours explicit rows", () => {
    expect(rows(rasterize({ box: 12, rows: ["#.#"] }))[0]).toBe("#.#.........");
  });

  it("bitmaps (text art, review by eye)", () => {
    const art = Object.fromEntries(["check", "cross", "diamond", "diamond-ring", "diamond-dot", "square-x", "alert", "info", "lock", "copy", "arrow-right", "chevron-down", "triangle-right", "disc", "ring"].map((n) => [n, rows(glyphGrid(n as keyof typeof GLYPHS)).join("\n")]));
    expect(art).toMatchSnapshot();
  });
});
