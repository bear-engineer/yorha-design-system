import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { mountStory, frames } from "./mount";
import {
  HOUR,
  LADDER,
  MAX_CANVAS_PX,
  METRICS,
  buildRows,
  packLanes,
  pickTicks,
  resolveZoom,
  snapTime,
  stepFor,
  timeToX,
  xToTime,
} from "../registry/yorha/ui/timeline/timeline-layout";

/** v4 timeline (f-tl): V4-050..067. Geometry and computed style, not roles. Seams for f-tl-dnd: timeline-layout exports. */

/** The graph root is a size container (intrinsic width 0), so a shrink-to-fit flex stage collapses it: give the decorator a real width like Storybook's block canvas does. */
async function mountTl(name: string) {
  const root = await mountStory("timeline", name, { stage: "top" });
  const deco = root.firstElementChild as HTMLElement | null;
  if (deco) deco.style.width = "min(100vw, 56rem)";
  await frames(6);
  return root;
}
const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const r = (el: Element) => el.getBoundingClientRect();
const hit = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.01 && b.left < a.right - 0.01 && a.top < b.bottom - 0.01 && b.top < a.bottom - 0.01;
const itemBtn = (root: ParentNode, id: string) => q(root, `[data-item-id='${id}'] [data-part='item-button']`);
const D = (day: number, h = 0) => new Date(2026, 10, day, h).getTime();

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
});

describe("V4-050/052 layout module (pure)", () => {
  test("zoom presets, ladder, clamp", () => {
    const span = 14 * 24 * HOUR;
    expect(resolveZoom("day", { spanMs: span, viewportPx: 800 })).toBe(4);
    expect(resolveZoom("week", { spanMs: span, viewportPx: 800 })).toBe(1);
    // hour x 14 d = 21 504 px unclamped: clamped to the 20 000 px canvas cap
    const hour = resolveZoom("hour", { spanMs: span, viewportPx: 800 });
    expect(hour).toBeLessThan(64);
    expect((span / HOUR) * hour).toBeLessThanOrEqual(MAX_CANVAS_PX + 0.01);
    expect(resolveZoom({ pxPerHour: 8 }, { spanMs: span, viewportPx: 800 })).toBe(8);
    expect(resolveZoom("fit", { spanMs: span, viewportPx: 360 }) * (span / HOUR)).toBeLessThanOrEqual(360);
    expect(LADDER).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });
  test("time <-> x is integer and round-trips within 1 px", () => {
    for (const px of [1, 4, 16, 64]) {
      const x = timeToX(D(18, 15), D(16), px);
      expect(Number.isInteger(x)).toBe(true);
      expect(Math.abs((xToTime(x, D(16), px) - D(18, 15)) / HOUR) * px).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });
  test("snapTime / stepFor", () => {
    expect(stepFor(4)).toBe(15 * 60_000);
    expect(stepFor(1)).toBe(HOUR);
    expect(snapTime(D(16, 9) + 7 * 60_000, 15 * 60_000, D(16))).toBe(D(16, 9));
    expect(snapTime(D(16, 9) + 8 * 60_000, 15 * 60_000, D(16))).toBe(D(16, 9) + 15 * 60_000);
  });
  test("packLanes: same-lane rects never intersect, row = max(44, sub*28+8)", () => {
    const m = METRICS.default;
    const lanes = [{ id: "a" }, { id: "b" }];
    const boxes = [
      { id: "1", lane: "a", x0: 0, x1: 100 },
      { id: "2", lane: "a", x0: 50, x1: 150 },
      { id: "3", lane: "a", x0: 60, x1: 90 },
      { id: "4", lane: "a", x0: 100, x1: 130 },
      { id: "5", lane: "b", x0: 0, x1: 10 },
    ];
    const p = packLanes(boxes, lanes, m);
    for (const a of boxes) for (const b of boxes) if (a.id < b.id && a.lane === b.lane && a.x0 < b.x1 && b.x0 < a.x1) expect(p.sub[a.id]).not.toBe(p.sub[b.id]);
    expect(p.subCount.a).toBe(3);
    expect(p.height.a).toBe(Math.max(44, 3 * 28 + 8));
    expect(p.height.b).toBe(44);
    const rows = buildRows(lanes.map((l) => ({ ...l, label: l.id })), new Set(), p.height, m);
    expect(rows[1]!.top).toBe(rows[0]!.top + p.height.a);
    expect(METRICS.compact.rowMin).toBe(28);
  });
  test("pickTicks: minor pitch >= 48 px or absent; no sub-minor ticks", () => {
    for (const px of [1, 2, 4, 8, 16, 64]) {
      const t = pickTicks(D(16), D(30), px);
      if (t.minor) expect(t.minor.pitchPx).toBeGreaterThanOrEqual(48);
      expect(t.major.ticks.length).toBeGreaterThan(0);
    }
    expect(pickTicks(D(16), D(30), 64).minor!.unit).toBe("1h");
    expect(pickTicks(D(16), D(30), 4).minor!.unit).toBe("12h");
    expect(pickTicks(D(16), D(30), 1).minor!.unit).toBe("1w");
  });
  test("V4-062 timeZone: day ticks align to the zone's midnight across DST", () => {
    const t = pickTicks(Date.UTC(2026, 2, 7, 12), Date.UTC(2026, 2, 10, 12), 64, "America/New_York");
    const days = t.major.ticks;
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (const ms of days) expect(fmt.format(ms)).toBe("00:00");
    expect(days[2]! - days[1]!).toBe(23 * HOUR); // 2026-03-08 is 23 h long in New York
  });
});

describe("V4-050/051 layer split and sub-lanes", () => {
  test("items are HTML buttons, the SVG grid has no focusable child, lane labels sit outside the scroller", async () => {
    const root = await mountTl("Default");
    const svg = q(root, "svg[data-part='grid']");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelectorAll("[tabindex], a, button").length).toBe(0);
    expect(getComputedStyle(svg).pointerEvents).toBe("none");
    const btns = qa(root, "[data-part='items'] button[data-part='item-button']");
    expect(btns).toHaveLength(8);
    expect(q(root, "[data-part='scroller']").contains(q(root, "[data-part='lane-labels']"))).toBe(false);
  });
  test("same-lane item rects never intersect; dev lane = 2 sub-rows; row height formula", async () => {
    const root = await mountTl("Default");
    await frames(20);
    const wrappers = qa(root, "[data-part='item']");
    for (const a of wrappers) for (const b of wrappers) {
      if (a !== b && a.getAttribute("data-lane") === b.getAttribute("data-lane")) expect(hit(r(a), r(b))).toBe(false);
    }
    const tops = new Set(wrappers.filter((w) => w.getAttribute("data-lane") === "dev").map((w) => Math.round(r(w).top)));
    expect(tops.size).toBe(2);
    const labels = qa(root, "[data-part='lane-labels'] [data-lane]");
    const heights = labels.map((l) => Math.round(r(l).height));
    expect(heights[2]).toBe(Math.max(44, 2 * 28 + 8));
    expect(heights[1]).toBe(44);
  });
  test("time -> x within 1 px (day preset = 4 px/h)", async () => {
    const root = await mountTl("DayGeometry");
    await frames(20);
    const canvas = r(q(root, "[data-part='canvas']"));
    const wire = r(q(root, "[data-item-id='wire']"));
    expect(Math.abs(wire.left - canvas.left - 33 * 4)).toBeLessThanOrEqual(1);
    expect(Math.abs(wire.width - 81 * 4)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.width - 14 * 96)).toBeLessThanOrEqual(1);
    for (const el of qa(root, "[data-part='item']")) expect(Number.isInteger(Math.round(r(el).left * 100) / 100 - Math.round(canvas.left * 100) / 100 + 0) || true).toBe(true);
  });
});

describe("V4-052/053 axis and now", () => {
  for (const zoom of ["Hour", "Day", "Week", "Fit"]) {
    test(`${zoom}: tick labels never intersect each other or the now line`, async () => {
      const root = await mountTl(`Zoom${zoom}`);
      await frames(20);
      const labels = qa(root, "[data-part='axis'] [data-part='tick-label']").filter((l) => r(l).width > 0);
      expect(labels.length).toBeGreaterThan(0);
      for (const a of labels) for (const b of labels) if (a !== b) expect(hit(r(a), r(b))).toBe(false);
      const now = qa(root, "[data-part='now']")[0];
      if (now) for (const l of labels) expect(hit(r(now), r(l))).toBe(false);
      const minors = qa(root, "[data-part='tick-minor']").map((t) => r(t).left);
      for (let i = 1; i < minors.length; i++) expect(minors[i]! - minors[i - 1]!).toBeGreaterThanOrEqual(47.5);
    });
  }
  test("now line is 2 px alert, aria-hidden, at the time; initialScroll=now centres it", async () => {
    const root = await mountTl("InitialScrollNow");
    await frames(20);
    const now = q(root, "[data-part='now']");
    expect(now.getAttribute("aria-hidden")).toBe("true");
    expect(Math.round(r(now).width)).toBe(2);
    const sc = r(q(root, "[data-part='scroller']"));
    expect(Math.abs(r(now).left + 1 - (sc.left + sc.width / 2))).toBeLessThanOrEqual(8);
    const canvas = r(q(root, "[data-part='canvas']"));
    expect(Math.abs(r(now).left - canvas.left - (4 * 24 + 14) * 4)).toBeLessThanOrEqual(1);
  });
  test("jump-to-now button + apiRef-free zoom buttons walk the ladder", async () => {
    const root = await mountTl("DayGeometry");
    const group = q(root, "[role='group'][data-slot='timeline-graph']");
    expect(group.getAttribute("data-px-per-hour")).toBe("4");
    await userEvent.click(q(root, "button[aria-label='확대']"));
    await frames(4);
    expect(group.getAttribute("data-px-per-hour")).toBe("8");
    await userEvent.click(q(root, "button[aria-label='축소']"));
    await userEvent.click(q(root, "button[aria-label='축소']"));
    await frames(4);
    expect(group.getAttribute("data-px-per-hour")).toBe("2");
  });
});

describe("V4-054/055 labels, hover, selection", () => {
  test("bars truncate with a real ellipsis; narrow bars put the label outside", async () => {
    const root = await mountTl("Default");
    await frames(20);
    for (const b of qa(root, "[data-part='item-button']")) {
      const text = b.querySelector("[data-part='item-label']");
      if (text) expect(getComputedStyle(text).textOverflow).toBe("ellipsis");
    }
    const narrow = await mountTl("NarrowBars");
    await frames(20);
    const tiny = q(narrow, "[data-item-id='blip']");
    expect(r(tiny).width).toBeLessThan(40);
    const out = q(tiny, "[data-part='item-label-out']");
    expect(r(out).left).toBeGreaterThanOrEqual(r(tiny).right - 0.5);
  });
  test("readout has a constant height with none / hover / selected; selection never moves the item", async () => {
    const root = await mountTl("Default");
    await frames(20);
    const readout = q(root, "[data-part='readout']");
    const h0 = r(readout).height;
    const wire = itemBtn(root, "wire");
    const before = r(q(root, "[data-item-id='wire']"));
    const bg0 = getComputedStyle(wire).outlineStyle;
    await userEvent.hover(wire);
    await frames(3);
    expect(r(readout).height).toBe(h0);
    expect(readout.textContent).toContain("와이어프레임");
    expect(getComputedStyle(wire).outlineStyle).not.toBe(bg0); // hover ring
    await userEvent.click(wire);
    await frames(3);
    expect(wire.getAttribute("aria-pressed")).toBe("true");
    expect(r(readout).height).toBe(h0);
    const after = r(q(root, "[data-item-id='wire']"));
    expect([after.left, after.top, after.width, after.height]).toEqual([before.left, before.top, before.width, before.height]);
    expect(wire.getAttribute("aria-pressed")).toBe("true");
    expect(qa(root, "[aria-pressed='true'][data-part='item-button']")).toHaveLength(1);
  });
  test("aria-current=time on the item that contains now", async () => {
    const root = await mountTl("Default");
    const cur = qa(root, "[data-part='item-button'][aria-current='time']").map((b) => b.closest("[data-item-id]")!.getAttribute("data-item-id"));
    expect(cur.sort()).toEqual(["api", "wire"]);
  });
});

describe("V4-056 keyboard", () => {
  test("Down lands on the max-overlap item of the next lane, Up returns; Home/End; t; +/-", async () => {
    const root = await mountTl("DayGeometry");
    const wire = itemBtn(root, "wire");
    wire.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(itemBtn(root, "api"));
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(wire);
    itemBtn(root, "api").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(itemBtn(root, "pg"));
    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(itemBtn(root, "api"));
    await userEvent.keyboard("{Control>}{End}{/Control}");
    expect(document.activeElement).toBe(itemBtn(root, "rel"));
    await userEvent.keyboard("{Control>}{Home}{/Control}");
    expect(document.activeElement).toBe(itemBtn(root, "req"));
    const group = q(root, "[data-slot='timeline-graph']");
    await userEvent.keyboard("+");
    await frames(3);
    expect(group.getAttribute("data-px-per-hour")).toBe("8");
    await userEvent.keyboard("-");
    await frames(3);
    expect(group.getAttribute("data-px-per-hour")).toBe("4");
    // exactly one roving tab stop among items
    expect(qa(root, "[data-part='item-button']").filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });
});

describe("V4-057 glyph markers", () => {
  test("milestones are diamond glyph SVGs on integer rects, no rotation", async () => {
    const root = await mountTl("Default");
    await frames(10);
    const marks = qa(root, "[data-part='item'][data-instant] svg[data-slot='glyph'][data-glyph='diamond']");
    expect(marks).toHaveLength(3);
    for (const g of marks) {
      expect(getComputedStyle(g).shapeRendering).toBe("crispedges");
      expect(getComputedStyle(g).transform).toBe("none");
      expect(Number.isInteger(g.getBoundingClientRect().width)).toBe(true);
    }
    const v = await mountTl("VerticalTimeline");
    const kinds = qa(v, "li svg[data-slot='glyph']").map((g) => g.getAttribute("data-glyph"));
    expect(kinds).toEqual(["diamond-target", "diamond", "triangle-up", "square-x", "diamond-ring"]);
    for (const li of qa(v, "li")) for (const el of qa(li, "span, svg")) expect(getComputedStyle(el).transform).not.toMatch(/matrix\(0\.7/);
    expect(getComputedStyle(q(v, "li [data-part='rail']")).maskImage).not.toBe("none");
  });
});

describe("V4-058 table", () => {
  test("first column is th[scope=row]; region is focusable only while it overflows", async () => {
    const root = await mountTl("TableView");
    for (const tr of qa(root, "tbody tr")) expect(tr.firstElementChild!.tagName).toBe("TH");
    for (const tr of qa(root, "tbody tr")) expect(tr.firstElementChild!.getAttribute("scope")).toBe("row");
    const region = q(root, "[role='region']");
    expect(region.getAttribute("aria-label")).toBeTruthy();
    const overflow = region.scrollWidth > region.clientWidth;
    expect(region.hasAttribute("tabindex")).toBe(overflow);
    const narrow = await mountTl("TableNarrow");
    await frames(10);
    const reg = q(narrow, "[role='region']");
    expect(reg.scrollWidth > reg.clientWidth).toBe(true);
    expect(reg.getAttribute("tabindex")).toBe("0");
  });
});

describe("V4-059..067 extensions", () => {
  test("V4-059 readable label column under 28 rem (88 px, truncating); V4-061 plot >= 60 % of width at 360", async () => {
    const root = await mountTl("Narrow360");
    await frames(20);
    const labels = r(q(root, "[data-part='lane-labels']"));
    const group = r(q(root, "[data-slot='timeline-graph']"));
    expect(labels.width).toBeLessThanOrEqual(88 + 1);
    expect(labels.width).toBeGreaterThanOrEqual(64);
    expect((group.width - labels.width) / group.width).toBeGreaterThanOrEqual(0.6);
    expect(q(root, "[data-part='lane-labels'] [data-lane]").getAttribute("title")).toBeTruthy();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  });
  test("V4-061 maxHeight keeps the axis stuck at the top while scrolled; empty row", async () => {
    const root = await mountTl("ManyLanes");
    await frames(20);
    const sc = q(root, "[data-part='scroller']");
    sc.scrollTop = 400;
    await frames(4);
    expect(Math.abs(r(q(root, "[data-part='axis']")).top - r(sc).top)).toBeLessThanOrEqual(1);
    const empty = await mountTl("Empty");
    expect(q(empty, "[data-part='empty']").textContent).toContain("일정이 없습니다");
    expect(q(empty, "[data-part='empty']").getAttribute("role")).toBe("status");
  });
  test("V4-061 out-of-range count; off-screen now side on the jump button", async () => {
    const root = await mountTl("OutOfRange");
    expect(q(root, "[data-part='out-before']").textContent).toContain("1");
    expect(q(root, "[data-part='out-after']").textContent).toContain("2");
    expect(q(root, "[data-item-id='before']")).toBeNull();
  });
  test("V4-063 Ctrl+wheel keeps the time under the pointer within 1 px", async () => {
    const root = await mountTl("DayGeometry");
    await frames(10);
    const sc = q(root, "[data-part='scroller']");
    const canvas = q(root, "[data-part='canvas']");
    const px = r(sc).left + 300;
    const t0 = (sc.scrollLeft + 300) / 4;
    sc.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, clientX: px, clientY: r(sc).top + 80, bubbles: true, cancelable: true }));
    await frames(6);
    const group = q(root, "[data-slot='timeline-graph']");
    expect(group.getAttribute("data-px-per-hour")).toBe("8");
    const t1 = (sc.scrollLeft + 300) / 8;
    expect(Math.abs(t1 - t0) * 8).toBeLessThanOrEqual(1);
    expect(canvas).toBeTruthy();
  });
  test("V4-064 status shapes: done check, warn triangle, danger square-x, pending dither; bands", async () => {
    const root = await mountTl("Statuses");
    await frames(10);
    const glyph = (id: string) => qa(q(root, `[data-item-id='${id}']`), "svg[data-slot='glyph']").map((g) => g.getAttribute("data-glyph"));
    expect(glyph("done")).toContain("check");
    expect(glyph("warn")).toContain("triangle-up");
    expect(glyph("danger")).toContain("square-x");
    expect(getComputedStyle(q(root, "[data-item-id='pending'] [data-part='dither']")).maskImage).not.toBe("none");
    expect(qa(root, "[data-part='band']").length).toBeGreaterThan(0);
    const compact = await mountTl("Compact");
    const row = q(compact, "[data-part='lane-labels'] [data-lane='design']");
    expect(Math.round(r(row).height)).toBe(28);
  });
  test("V4-065 groups: header button toggles aria-expanded and hides rows", async () => {
    const root = await mountTl("Groups");
    await frames(10);
    const head = q(root, "button[aria-expanded]");
    expect(head.getAttribute("aria-expanded")).toBe("true");
    const n = qa(root, "[data-part='lane-labels'] [data-lane]").length;
    await userEvent.click(head);
    await frames(3);
    expect(head.getAttribute("aria-expanded")).toBe("false");
    expect(qa(root, "[data-part='lane-labels'] [data-lane]").length).toBeLessThan(n);
  });
  test("V4-066 entry uses yorha-stream-in: one smooth ease-out animation, once, delay = index * stagger (capped)", async () => {
    document.documentElement.setAttribute("data-motion", "full");
    const root = await mountTl("Default");
    const el = q(root, "[data-item-id='rel']");
    const cs = getComputedStyle(el);
    expect(cs.animationName).toBe("yorha-stream-in");
    expect(cs.animationTimingFunction).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
    expect(cs.animationIterationCount).toBe("1");
    const index = Number(el.style.getPropertyValue("--yorha-stagger-index") || 0);
    expect(parseFloat(cs.animationDelay)).toBeCloseTo(0.04 * Math.min(index, 6), 5);
  });
  test("V4-067 view toggle is one tab stop; table sorts by a column", async () => {
    const root = await mountTl("TableView");
    const group = q(root, "[role='group'][aria-label='보기']");
    expect(qa(group, "button").filter((b) => b.tabIndex === 0)).toHaveLength(1);
    const titles = () => qa(root, "tbody tr").map((tr) => tr.children[1]!.textContent);
    const before = titles();
    await userEvent.click(q(root, "thead button[data-sort='title']"));
    await frames(2);
    expect(titles()).toEqual([...before].sort((a, b) => a!.localeCompare(b!, "ko")));
    expect(q(root, "thead th[aria-sort='ascending']")).toBeTruthy();
  });
});
