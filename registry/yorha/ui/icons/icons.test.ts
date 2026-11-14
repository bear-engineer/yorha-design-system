import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as icons from "./icons";

/** G3 drawing rules over every exported icon component (and every dir/size variant). */
const SIZE_OF: Record<string, number> = {
  CheckIcon: 12,
  CrossIcon: 12,
  PlusIcon: 12,
  MinusIcon: 12,
  TriangleIcon: 12,
  SortIcon: 12,
  GripIcon: 12,
  CalendarIcon: 16,
  ClockIcon: 16,
  EyeIcon: 16,
  EyeOffIcon: 16,
  SearchIcon: 16,
};
const EXPECTED = [...Object.keys(SIZE_OF), "ChevronIcon"].sort();

type Variant = { name: string; props: Record<string, unknown>; size: number };
const variants: Variant[] = [];
for (const [name, Cmp] of Object.entries(icons)) {
  if (!/Icon$/.test(name) || typeof Cmp !== "function") continue;
  void Cmp;
  if (name === "ChevronIcon") {
    for (const size of [12, 16]) for (const dir of ["up", "down", "left", "right"]) variants.push({ name, props: { size, dir }, size });
  } else if (name === "TriangleIcon") {
    for (const dir of ["up", "down", "left", "right"]) variants.push({ name, props: { dir }, size: 12 });
  } else variants.push({ name, props: {}, size: SIZE_OF[name]! });
}
const html = (v: Variant) => renderToStaticMarkup(createElement((icons as unknown as Record<string, ComponentType<Record<string, unknown>>>)[v.name]!, v.props));
const attr = (s: string, a: string) => new RegExp(`\\s${a}="([^"]*)"`).exec(s)?.[1];

describe("icons (G3)", () => {
  it("exports exactly the specified icon components", () => {
    const names = Object.keys(icons).filter((n) => /Icon$/.test(n)).sort();
    expect(names).toEqual(EXPECTED);
  });

  for (const v of variants) {
    const label = `${v.name} ${JSON.stringify(v.props)}`;
    describe(label, () => {
      const markup = html(v);
      const svg = /<svg[^>]*>/.exec(markup)![0]!;
      it("uses a size from {12, 16, 20}; viewBox equals the render size", () => {
        expect([12, 16, 20]).toContain(v.size);
        expect(attr(svg, "width")).toBe(String(v.size));
        expect(attr(svg, "height")).toBe(String(v.size));
        expect(attr(svg, "viewBox")).toBe(`0 0 ${v.size} ${v.size}`);
      });
      it("is decorative and does not shrink", () => {
        expect(attr(svg, "aria-hidden")).toBe("true");
        expect(attr(svg, "focusable")).toBe("false");
        expect(attr(svg, "class")).toContain("shrink-0");
      });
      it("strokes at 2px square/miter in currentColor, or is solid with no stroke", () => {
        const solid = attr(svg, "fill") === "currentColor";
        if (solid) {
          expect(svg).not.toMatch(/\sstroke="/);
          return;
        }
        expect(attr(svg, "fill")).toBe("none");
        expect(attr(svg, "stroke")).toBe("currentColor");
        expect(attr(svg, "stroke-width")).toBe("2");
        expect(attr(svg, "stroke-linecap")).toBe("square");
        expect(attr(svg, "stroke-linejoin")).toBe("miter");
      });
      it("has integer coordinates only", () => {
        const body = markup.replace(/<svg[^>]*>/, "");
        const values: string[] = [];
        for (const m of body.matchAll(/\s(d|points)="([^"]*)"/g)) values.push(...(m[2]!.match(/-?\d*\.?\d+/g) ?? []));
        for (const m of body.matchAll(/\s(x|y|cx|cy|r|width|height)="([^"]*)"/g)) values.push(m[2]!);
        expect(values.length).toBeGreaterThan(0);
        for (const n of values) expect(Number.isInteger(Number(n)), `${label}: ${n}`).toBe(true);
        expect(body).not.toMatch(/\sstroke-width=/); // the width lives on the root only
      });
      it("stays inside its box", () => {
        const body = markup.replace(/<svg[^>]*>/, "");
        const nums: number[] = [];
        for (const m of body.matchAll(/\s(d|points)="([^"]*)"/g)) nums.push(...(m[2]!.match(/-?\d+/g) ?? []).map(Number));
        for (const n of nums) expect(n >= 0 && n <= v.size).toBe(true);
      });
    });
  }
});
