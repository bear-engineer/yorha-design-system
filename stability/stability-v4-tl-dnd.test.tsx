import { createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { frames, mountStory } from "./mount";
import { TimelineGraph, type TimelineChange, type TimelineGraphItem, type TimelineLane } from "../registry/yorha/ui/timeline/timeline";

/** v4 timeline drag and drop (f-tl-dnd): V4-070..082. Real pointer events (same sequence as the kanban tests), geometry assertions. */

const D = (day: number, h = 0, m = 0) => new Date(2026, 10, day, h, m);
const MIN = 60_000;
const lanes: TimelineLane[] = [
  { id: "plan", label: "기획" },
  { id: "design", label: "디자인" },
  { id: "dev", label: "개발" },
  { id: "qa", label: "QA" },
  { id: "ship", label: "배포" },
];
const items: TimelineGraphItem[] = [
  { id: "req", lane: "plan", title: "요구사항 정리", start: D(16, 9), end: D(18, 18) },
  { id: "scope", lane: "plan", title: "범위 확정 회의", start: D(18, 15) },
  { id: "wire", lane: "design", title: "와이어프레임", start: D(17, 9), end: D(20, 18) },
  { id: "api", lane: "dev", title: "결제 API 구현", start: D(19, 10), end: D(25, 19) },
  { id: "pg", lane: "dev", title: "PG사 연동", start: D(23, 9), end: D(27, 12) },
  { id: "it", lane: "qa", title: "통합 테스트", start: D(26, 9), end: D(28, 18) },
  { id: "lock", lane: "qa", title: "고정 일정", start: D(20, 9), end: D(21, 9), locked: true },
];
const base = { label: "결제 모듈 출시 일정", lanes, range: { start: D(16), end: D(30) }, now: D(20, 14), zoom: { pxPerHour: 8 } as const };

const mounted: { root: Root; el: HTMLElement }[] = [];
afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.el.remove();
  }
  document.documentElement.removeAttribute("data-motion");
});

type Opts = { ancestor?: string; props?: Partial<ComponentProps<typeof TimelineGraph>> };
async function mountGraph(opts: Opts = {}) {
  const changes: TimelineChange[] = [];
  const el = document.createElement("div");
  el.style.cssText = "width:min(100vw,56rem)";
  document.body.append(el);
  const root = createRoot(el);
  mounted.push({ root, el });
  const graph = createElement(TimelineGraph, { ...base, defaultItems: items, onItemsChange: (_n, c) => changes.push(c), ...opts.props });
  const inner = opts.ancestor ? createElement("div", { style: { transform: opts.ancestor, willChange: "transform" } }, graph) : graph;
  root.render(createElement("div", { lang: "ko", "data-theme": "light", className: "bg-yorha-panel p-4 text-yorha-fg" }, inner));
  await frames(3);
  await document.fonts.ready;
  document.documentElement.setAttribute("data-motion", "off");
  await frames(6);
  return { el, changes };
}

const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const r = (el: Element) => el.getBoundingClientRect();
const btn = (root: ParentNode, id: string) => q(root, `[data-item-id='${id}'] [data-part='item-button']`);
const wrap = (root: ParentNode, id: string) => q(root, `[data-item-id='${id}']`);
const live = (root: ParentNode) => q(root, "[data-part='live']").textContent ?? "";
const laneMid = (root: ParentNode, id: string) => {
  const b = r(q(root, `[data-part='lane-labels'] [data-lane='${id}']`));
  return b.top + b.height / 2;
};
const centre = (el: Element) => ({ x: r(el).left + r(el).width / 2, y: r(el).top + r(el).height / 2 });
/** A grab point 48 px inside the bar (past the 24 px start handle), so the drag does not start in the autoscroll zone. */
const grab = (el: Element) => ({ x: r(el).left + 48, y: r(el).top + r(el).height / 2 });

const ptr = (target: EventTarget, type: string, x: number, y: number, pointerType = "mouse") =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === "pointerup" ? 0 : 1, pointerId: 1, pointerType, isPrimary: true }),
  );
async function dragTo(from: Element, x0: number, y0: number, x1: number, y1: number, hold?: () => void | Promise<void>) {
  ptr(from, "pointerdown", x0, y0);
  for (let i = 1; i <= 10; i++) {
    ptr(document, "pointermove", x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10);
    await frames(1);
  }
  await frames(3);
  await hold?.();
}
const drop = async (x: number, y: number) => {
  ptr(document, "pointerup", x, y);
  await frames(4);
};

describe("V4-071 pointer move", () => {
  test("T4: +101 px / +90 px -> overlay under the pointer, slot on a step multiple, lane +2, one callback", async () => {
    const { el, changes } = await mountGraph();
    const b = btn(el, "wire");
    const c = grab(b);
    const r0 = r(wrap(el, "wire"));
    const canvas0 = r(q(el, "[data-part='canvas']"));
    await dragTo(b, c.x, c.y, c.x + 101, c.y + 90, () => {
      const ov = q(document.body, "[data-slot='timeline-overlay']");
      expect(ov, "overlay exists").toBeTruthy();
      expect(el.contains(ov), "overlay is portaled out of the graph").toBe(false);
      expect(Math.abs(r(ov).left - (r0.left + 101)), "overlay x").toBeLessThanOrEqual(1);
      expect(Math.abs(r(ov).top - (r0.top + 90)), "overlay y").toBeLessThanOrEqual(1);
      const slot = q(el, "[data-part='slot']");
      const dx = r(slot).left - r0.left;
      expect(dx % 2, "slot delta is a step multiple (15 min = 2 px at 8 px/h)").toBe(0);
      expect(Math.abs(dx - 101)).toBeLessThanOrEqual(2);
      expect(Math.abs(r(slot).width - r0.width)).toBeLessThanOrEqual(0.5);
      expect(r(slot).top).toBeGreaterThan(r(wrap(el, "it")).top - 40);
      void canvas0;
    });
    await drop(c.x + 101, c.y + 90);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.type).toBe("move");
    expect(changes[0]!.source).toBe("pointer");
    expect(changes[0]!.to.lane).toBe("qa");
    expect((changes[0]!.to.start - changes[0]!.from.start) % (15 * MIN)).toBe(0);
    expect(Math.abs((changes[0]!.to.start - changes[0]!.from.start) / MIN - (101 / 8) * 60)).toBeLessThanOrEqual(15);
    expect(q(document.body, "[data-slot='timeline-overlay']")).toBeNull();
    expect(wrap(el, "wire").getAttribute("data-lane")).toBe("qa");
  });

  test("T5: overlay stays under the pointer inside a transformed ancestor", async () => {
    const { el } = await mountGraph({ ancestor: "translate(37px, 23px)" });
    const b = btn(el, "wire");
    const c = grab(b);
    const r0 = r(wrap(el, "wire"));
    await dragTo(b, c.x, c.y, c.x + 140, c.y + 40, () => {
      const ov = q(document.body, "[data-slot='timeline-overlay']");
      expect(Math.abs(r(ov).left - (r0.left + 140))).toBeLessThanOrEqual(1);
      expect(Math.abs(r(ov).top - (r0.top + 40))).toBeLessThanOrEqual(1);
    });
    await drop(c.x + 140, c.y + 40);
  });

  test("T8: variable row heights, pointer on the middle of the 2-sub-row dev lane and of ship", async () => {
    const { el, changes } = await mountGraph();
    const b = btn(el, "wire");
    const c = grab(b);
    await dragTo(b, c.x, c.y, c.x, laneMid(el, "dev"));
    await drop(c.x, laneMid(el, "dev"));
    expect(changes.at(-1)!.to.lane).toBe("dev");
    const b2 = btn(el, "wire");
    const c2 = grab(b2);
    await dragTo(b2, c2.x, c2.y, c2.x, laneMid(el, "ship"));
    await drop(c2.x, laneMid(el, "ship"));
    expect(changes.at(-1)!.to.lane).toBe("ship");
  });

  test("T13: no neighbour moves or resizes while dragging", async () => {
    const { el } = await mountGraph();
    const others = ["req", "scope", "api", "pg", "it"];
    const before = others.map((id) => r(wrap(el, id)));
    const labels = qa(el, "[data-part='lane-labels'] [data-lane]").map((l) => r(l).height);
    const b = btn(el, "wire");
    const c = grab(b);
    await dragTo(b, c.x, c.y, c.x + 200, c.y + 70, () => {
      others.forEach((id, i) => {
        const a = r(wrap(el, id));
        expect(Math.abs(a.left - before[i]!.left) + Math.abs(a.top - before[i]!.top) + Math.abs(a.width - before[i]!.width) + Math.abs(a.height - before[i]!.height), id).toBeLessThanOrEqual(0.5);
      });
      expect(qa(el, "[data-part='lane-labels'] [data-lane]").map((l) => r(l).height)).toEqual(labels);
    });
    await drop(c.x + 200, c.y + 70);
  });

  test("a read-only chart, a locked item and a stray click never start a drag", async () => {
    const ro = await mountGraph({ props: { readOnly: true } });
    const b = btn(ro.el, "wire");
    const c = grab(b);
    await dragTo(b, c.x, c.y, c.x + 80, c.y);
    expect(q(document.body, "[data-slot='timeline-overlay']")).toBeNull();
    await drop(c.x + 80, c.y);
    expect(ro.changes).toHaveLength(0);
    expect(qa(ro.el, "[data-handle]")).toHaveLength(0);
    mounted.pop()!.root.unmount();

    const { el, changes } = await mountGraph();
    const lk = btn(el, "lock");
    expect(lk.getAttribute("aria-disabled")).toBe("true");
    expect(qa(wrap(el, "lock"), "[data-handle]")).toHaveLength(0);
    const cl = grab(lk);
    await dragTo(lk, cl.x, cl.y, cl.x + 80, cl.y);
    expect(q(document.body, "[data-slot='timeline-overlay']")).toBeNull();
    await drop(cl.x + 80, cl.y);
    const cw = grab(btn(el, "wire"));
    ptr(btn(el, "wire"), "pointerdown", cw.x, cw.y);
    ptr(document, "pointerup", cw.x, cw.y);
    await frames(3);
    expect(changes).toHaveLength(0);
  });

  test("Esc during a pointer drag restores and fires nothing", async () => {
    const { el, changes } = await mountGraph();
    const b = btn(el, "wire");
    const c = grab(b);
    const r0 = r(wrap(el, "wire"));
    await dragTo(b, c.x, c.y, c.x + 90, c.y + 50);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    await frames(4);
    ptr(document, "pointerup", c.x + 90, c.y + 50);
    await frames(3);
    expect(changes).toHaveLength(0);
    expect(q(el, "[data-part='slot']")).toBeNull();
    expect(r(wrap(el, "wire")).left).toBeCloseTo(r0.left, 0);
  });
});

describe("V4-072 keyboard", () => {
  test("T11: Space, Right x2, Down, Space -> keyboard source, +30 min, lane +1, focus stays, Korean announcements", async () => {
    const { el, changes } = await mountGraph();
    const b = btn(el, "wire");
    b.focus();
    expect(b.getAttribute("aria-roledescription")).toBe("이동 가능한 일정");
    expect(b.getAttribute("aria-keyshortcuts")).toContain("Space");
    expect(b.getAttribute("aria-describedby")).toBeTruthy();
    await userEvent.keyboard(" ");
    await frames(3);
    expect(live(el)).toContain("와이어프레임");
    expect(live(el)).toContain("집었습니다");
    expect(q(el, "[data-part='slot']")).toBeTruthy();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await userEvent.keyboard("{ArrowDown}");
    await frames(2);
    expect(r(q(el, "[data-part='slot']")).left - r(wrap(el, "wire")).left).toBeCloseTo(4, 0);
    await userEvent.keyboard(" ");
    await frames(3);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.source).toBe("keyboard");
    expect(changes[0]!.to.start - changes[0]!.from.start).toBe(30 * MIN);
    expect(changes[0]!.to.lane).toBe("dev");
    expect(document.activeElement).toBe(btn(el, "wire"));
    expect(live(el)).toContain("놓았습니다");
    expect(q(el, "[data-part='slot']")).toBeNull();
  });

  test("T10: Esc restores, no callback, focus stays; ] then Right extends the end; Shift = 1 h", async () => {
    const { el, changes } = await mountGraph();
    const b = btn(el, "wire");
    b.focus();
    await userEvent.keyboard(" {ArrowRight}{ArrowDown}{Escape}");
    await frames(3);
    expect(changes).toHaveLength(0);
    expect(document.activeElement).toBe(btn(el, "wire"));
    expect(wrap(el, "wire").getAttribute("data-lane")).toBe("design");
    expect(live(el)).toContain("취소");

    await userEvent.keyboard(" ]{ArrowRight}{Shift>}{ArrowRight}{/Shift} ");
    await frames(3);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.type).toBe("resize-end");
    expect(changes[0]!.to.start).toBe(changes[0]!.from.start);
    expect(changes[0]!.to.end! - changes[0]!.from.end!).toBe(15 * MIN + 60 * MIN);
  });

  test("Space on a read-only chart still selects (no lift)", async () => {
    const { el } = await mountGraph({ props: { readOnly: true } });
    btn(el, "wire").focus();
    await userEvent.keyboard(" ");
    await frames(2);
    expect(btn(el, "wire").getAttribute("aria-pressed")).toBe("true");
    expect(q(el, "[data-part='slot']")).toBeNull();
    expect(btn(el, "wire").getAttribute("aria-roledescription")).toBeNull();
  });
});

describe("V4-073 resize", () => {
  test("T6: end handle +49 px -> end snapped, start unchanged; start cannot cross the end", async () => {
    const { el, changes } = await mountGraph();
    const h = q(wrap(el, "wire"), "[data-handle='end']");
    expect(r(h).width).toBeGreaterThanOrEqual(24);
    const c = centre(h);
    const w0 = r(wrap(el, "wire"));
    await dragTo(h, c.x, c.y, c.x + 49, c.y, () => {
      expect(Math.abs(r(wrap(el, "wire")).width - (w0.width + 50))).toBeLessThanOrEqual(1);
      expect(q(document.body, "[data-slot='timeline-overlay']")).toBeNull();
    });
    await drop(c.x + 49, c.y);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.type).toBe("resize-end");
    expect(changes[0]!.to.start).toBe(changes[0]!.from.start);
    expect(changes[0]!.to.end! - changes[0]!.from.end!).toBe(25 * 15 * MIN);

    const hs = q(wrap(el, "wire"), "[data-handle='start']");
    const cs = centre(hs);
    await dragTo(hs, cs.x, cs.y, cs.x + 5000, cs.y);
    await drop(cs.x + 5000, cs.y);
    const last = changes.at(-1)!;
    expect(last.type).toBe("resize-start");
    expect(last.to.end).toBe(last.from.end);
    expect(last.to.end! - last.to.start).toBe(15 * MIN);
  });

  test("maxDuration clamps the end handle", async () => {
    const { el, changes } = await mountGraph({ props: { maxDuration: 90 * 3_600_000 } });
    const h = q(wrap(el, "wire"), "[data-handle='end']");
    const c = centre(h);
    await dragTo(h, c.x, c.y, c.x + 3000, c.y);
    await drop(c.x + 3000, c.y);
    const ch = changes.at(-1)!;
    expect(ch.to.end! - ch.to.start).toBe(90 * 3_600_000);
  });
});

describe("V4-074 autoscroll", () => {
  test("T7: pointer held in the right 12 % scrolls >= 300 px/s; final start follows the pointer within 1 step", async () => {
    const { el, changes } = await mountGraph();
    const sc = q(el, "[data-part='scroller']");
    const b = btn(el, "wire");
    const c = grab(b);
    const x1 = r(sc).right - 14;
    const left0 = r(wrap(el, "wire")).left;
    await dragTo(b, c.x, c.y, x1, c.y);
    const s0 = sc.scrollLeft;
    const t0 = performance.now();
    await new Promise((res) => setTimeout(res, 600));
    const rate = ((sc.scrollLeft - s0) / (performance.now() - t0)) * 1000;
    expect(rate, "px/s").toBeGreaterThanOrEqual(300);
    const scrollNow = sc.scrollLeft;
    ptr(document, "pointerup", x1, c.y);
    await frames(4);
    const ch = changes[0]!;
    const grabX = c.x - left0;
    const wantPx = x1 - r(sc).left + scrollNow - grabX;
    const wantStart = D(16).getTime() + (wantPx / 8) * 3_600_000;
    expect(Math.abs(ch.to.start - wantStart)).toBeLessThanOrEqual(15 * MIN);
  });
});

describe("V4-075 canMove", () => {
  test("T9: a rejected lane -> no callback, reason announced, slot data-invalid, <= 1 flicker per second", async () => {
    const reason = "배포 구간에는 옮길 수 없습니다";
    const { el, changes } = await mountGraph({ props: { canMove: (next: TimelineGraphItem) => (next.lane === "ship" ? { ok: false as const, reason } : true) } });
    const b = btn(el, "wire");
    const c = grab(b);
    ptr(b, "pointerdown", c.x, c.y);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      ptr(document, "pointermove", c.x + 20, i % 2 ? c.y : laneMid(el, "ship"));
      await new Promise((res) => setTimeout(res, 30));
    }
    expect(performance.now() - t0).toBeLessThan(1000);
    ptr(document, "pointermove", c.x + 20, laneMid(el, "ship"));
    await frames(3);
    const slot = q(el, "[data-part='slot']");
    expect(slot.hasAttribute("data-invalid")).toBe(true);
    expect(Number(slot.getAttribute("data-flickers"))).toBeLessThanOrEqual(1);
    expect(live(el)).toContain(reason);
    expect(q(el, "[data-part='readout']").textContent).toContain(reason);
    await drop(c.x + 20, laneMid(el, "ship"));
    expect(wrap(el, "wire").getAttribute("data-lane")).not.toBe("ship");
    expect(changes.every((x) => x.to.lane !== "ship")).toBe(true);
  });

  test("overlap stacks after the drop and both items get data-conflict (collision allow)", async () => {
    const { el, changes } = await mountGraph();
    const b = btn(el, "wire");
    const c = grab(b);
    await dragTo(b, c.x, c.y, c.x + 8 * 40, laneMid(el, "dev"));
    await drop(c.x + 8 * 40, laneMid(el, "dev"));
    expect(changes).toHaveLength(1);
    expect(wrap(el, "wire").hasAttribute("data-conflict")).toBe(true);
    expect(wrap(el, "api").hasAttribute("data-conflict")).toBe(true);
  });

  test("collision=block: an overlapping drop is clamped to the last valid position", async () => {
    const { el, changes } = await mountGraph({ props: { collision: "block" } });
    const b = btn(el, "wire");
    const c = grab(b);
    await dragTo(b, c.x, c.y, c.x + 8 * 40, laneMid(el, "dev"));
    await drop(c.x + 8 * 40, laneMid(el, "dev"));
    expect(changes.every((x) => x.to.lane !== "dev")).toBe(true);
  });
});

describe("V4-076 touch", () => {
  test("only the selected item's grip starts a touch drag; handles need selection; the body keeps touch-action pan", async () => {
    const { el } = await mountGraph();
    const body = btn(el, "wire");
    expect(getComputedStyle(body).touchAction).toContain("pan");
    expect(qa(wrap(el, "wire"), "[data-grip]")).toHaveLength(1);
    expect(getComputedStyle(q(wrap(el, "wire"), "[data-grip]")).opacity).toBe("0");
    body.click();
    await frames(3);
    const grip = q(wrap(el, "wire"), "[data-grip]");
    expect(getComputedStyle(grip).opacity).toBe("1");
    expect(r(grip).width).toBeGreaterThanOrEqual(24);
    expect(r(grip).height).toBeGreaterThanOrEqual(24);
    expect(getComputedStyle(grip).touchAction).toBe("none");
    expect(getComputedStyle(q(wrap(el, "wire"), "[data-handle='end']")).touchAction).toBe("none");
    const unsel = q(wrap(el, "api"), "[data-handle='end']");
    expect(getComputedStyle(unsel).touchAction).not.toBe("none");
  });
});

describe("V4-077 table edit path", () => {
  test("T17: changing the start in the table fires the same callback shape with source table", async () => {
    const { el, changes } = await mountGraph({ props: { view: "table" } });
    const input = q<HTMLInputElement>(el, "tr[data-item-id='wire'] input[type='datetime-local']");
    expect(input).toBeTruthy();
    expect(input.step).toBe("900");
    input.focus();
    await userEvent.fill(input, "2026-11-17T10:00");
    input.blur();
    await frames(3);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.source).toBe("table");
    expect(changes[0]!.type).toBe("resize-start");
    expect(changes[0]!.to.start).toBe(D(17, 10).getTime());
  });
});

describe("stories (V4-078)", () => {
  test("Editable story mounts editable and read-only story has no handles", async () => {
    const root = await mountStory("timeline", "DnD", { stage: "top" });
    expect(root.querySelectorAll("[data-handle]").length).toBeGreaterThan(0);
    const ro = await mountStory("timeline", "ReadOnly", { stage: "top" });
    expect(ro.querySelectorAll("[data-handle]")).toHaveLength(0);
  });
});

describe("f-tl visual defects found by the parent", () => {
  test("'현재로' button: the leading glyph cell paints a glyph (in view and off screen), light and dark", async () => {
    for (const theme of ["light", "dark"]) {
      const { el } = await mountGraph();
      (el.firstElementChild as HTMLElement).setAttribute("data-theme", theme);
      await frames(3);
      const b = qa(el, "[data-part='toolbar'] button").find((x) => x.textContent?.includes("현재로"))!;
      const cell = q(b, "span[aria-hidden='true']");
      const glyphs = qa<SVGElement>(cell, "svg");
      const visible = glyphs.filter((g) => getComputedStyle(g).opacity === "1");
      expect(visible, `${theme}: exactly one visible glyph`).toHaveLength(1);
      const g = r(visible[0]!);
      expect(g.width).toBeGreaterThan(8);
      expect(g.height).toBeGreaterThan(8);
      expect(visible[0]!.querySelectorAll("rect,path,circle").length).toBeGreaterThan(0);
      expect(getComputedStyle(visible[0]!).color).not.toBe(getComputedStyle(b).backgroundColor);
      mounted.pop()!.root.unmount();
    }
  });

  test("360 px: lane labels stay readable (>= 2 characters visible), no page overflow", async () => {
    const root = await mountStory("timeline", "Narrow360", { stage: "top" });
    await frames(10);
    const labels = qa(root, "[data-part='lane-labels'] [data-lane] span");
    expect(labels.length).toBeGreaterThanOrEqual(5);
    for (const l of labels) {
      // Readable = the whole label fits (no clipping) and at least two glyphs wide. Measured against the label's
      // own font size, not a fixed px, so the Latin-only tracking rule (1b3f2c1) does not change the verdict.
      const fs = parseFloat(getComputedStyle(l).fontSize);
      expect(r(l).width, l.textContent ?? "").toBeGreaterThanOrEqual(Math.min(l.textContent!.length, 2) * fs * 0.6);
      expect(l.scrollWidth, `${l.textContent} fits its cell`).toBeLessThanOrEqual(l.clientWidth + 1);
      expect(l.scrollWidth, `${l.textContent} is not clipped to one glyph`).toBeGreaterThan(0);
      expect(getComputedStyle(l).position).not.toBe("absolute");
    }
    expect(root.querySelector("[data-part='lane-labels'] [data-lane='design']")!.getAttribute("title")).toBe("디자인");
    const design = labels.find((l) => l.textContent === "디자인")!;
    expect(design.scrollWidth).toBeLessThanOrEqual(design.clientWidth + 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  });
});
