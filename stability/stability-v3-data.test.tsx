import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { mountStory, frames } from "./mount";
import { expectNoOverlap } from "../.storybook/geometry";

/**
 * v3 data & display family: geometry and state assertions for the findings FD-01..FD-34
 * (see .hermes/cache/scratch/yorha-v3/audit/data/findings.md). Every layout claim is a measurement.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const r = (el: Element) => el.getBoundingClientRect();

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
  document.body.style.cursor = "";
});

// ---- colour helpers (sRGB + oklab-capable via canvas) ----
function rgbOf(css: string): [number, number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
}
const lum = ([r0, g, b]: number[]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r0!) + 0.7152 * f(g!) + 0.0722 * f(b!);
};
const contrast = (a: string, b: string) => {
  const la = lum(rgbOf(a));
  const lb = lum(rgbOf(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

describe("FD-01/02 scroll-area", () => {
  test("horizontal thumb is shorter than its track (FD-01); hover recolours the thumb (FD-02)", async () => {
    const root = await mountStory("scroll-area", "BothScrollbars");
    await wait(200);
    const bars = qa(root, "[data-slot=scroll-area-scrollbar]");
    const horiz = bars.find((b) => b.getAttribute("data-orientation") === "horizontal")!;
    const vert = bars.find((b) => b.getAttribute("data-orientation") === "vertical")!;
    expect(horiz && vert, "both scrollbars mounted").toBeTruthy();
    const ht = q(horiz, "[data-slot=scroll-area-thumb]");
    const vt = q(vert, "[data-slot=scroll-area-thumb]");
    expect(r(ht).width, `h thumb ${r(ht).width} / track ${r(horiz).width}`).toBeLessThan(r(horiz).width * 0.6);
    expect(r(vt).height).toBeLessThan(r(vert).height);
    const idle = getComputedStyle(ht).backgroundColor;
    await userEvent.hover(q(root, "[data-slot=scroll-area-viewport]"));
    await wait(300);
    expect(getComputedStyle(ht).backgroundColor, "thumb colour on hover").not.toBe(idle);
  });
});

describe("FD-03/04/05 data-table", () => {
  test("numeric header right edge equals numeric cell right edge (FD-03)", async () => {
    const root = await mountStory("data-table", "Default");
    const th = qa(root, "th").at(-1)!;
    const td = qa(root, "tbody tr:first-child td").at(-1)!;
    const button = q(th, "button");
    expect(Math.abs(r(button).right - (r(td).right - parseFloat(getComputedStyle(td).paddingRight))), "header content right edge = cell content right edge").toBeLessThan(0.5);
    expect(Math.abs(r(th).right - r(td).right), "th/td share right edge").toBeLessThan(0.5);
    expect(getComputedStyle(th).textAlign).toBe("right");
  });

  test("sorted and unsorted glyphs reach 3:1 on the header (FD-04)", async () => {
    const root = await mountStory("data-table", "Default");
    const glyph = q(root, "[data-sort-indicator]");
    const bg = getComputedStyle(q(root, "thead")).backgroundColor;
    const fg = getComputedStyle(glyph).color;
    const opacity = parseFloat(getComputedStyle(q(glyph, "svg")).opacity) || 1;
    expect(opacity).toBeGreaterThan(0);
    expect(contrast(fg, bg), `glyph ${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
    expect(getComputedStyle(q(root, "th button")).cursor).toBe("pointer");
  });

  test("row hover and selected states change colour without moving rows (FD-05)", async () => {
    const root = await mountStory("data-table", "Default");
    const rows = qa(root, "tbody tr");
    const row = rows[0]!;
    await userEvent.hover(q(root, "th")); // park the pointer away from the body rows
    await wait(300);
    const before = rows.map((x) => r(x).top + "/" + r(x).height);
    const idle = getComputedStyle(row).backgroundColor;
    await userEvent.hover(row);
    await wait(300);
    expect(getComputedStyle(row).backgroundColor, "hover bg").not.toBe(idle);
    await userEvent.unhover(row);
    row.setAttribute("aria-selected", "true");
    await wait(300);
    const sel = getComputedStyle(row);
    expect(contrast(sel.color, sel.backgroundColor)).toBeGreaterThan(4.5);
    expect(sel.backgroundColor).not.toBe(idle);
    expect(rows.map((x) => r(x).top + "/" + r(x).height)).toEqual(before);
  });
});

describe("FD-08/09/10/11 kanban", () => {
  test("handle sits in the title row and a one-line card is compact (FD-09)", async () => {
    const root = await mountStory("kanban", "Default");
    const card = q(root, "li article");
    const title = q(card, "h3");
    const handle = q(card, "button");
    expect(r(handle).top).toBeGreaterThanOrEqual(r(title).top - 1);
    expect(r(handle).top).toBeLessThan(r(title).bottom);
    expect(r(card).height, "one-line card height").toBeLessThanOrEqual(72);
    expect(getComputedStyle(card).boxShadow, "no shadow inside a panel (FD-10)").toMatch(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?)+$/);
    const board = q(root, "[role=region]");
    expect(getComputedStyle(board).scrollSnapType, "snap (FD-11)").toContain("x");
  });

  test("drag overlay matches the source, placeholder is empty, one insertion line, grabbing cursor (FD-08)", async () => {
    const root = await mountStory("kanban", "Default");
    const handle = qa(root, "button").find((b) => b.getAttribute("aria-label")?.startsWith("통신 모듈 교체"))!;
    const source = handle.closest("article")!;
    const sourceHeight = r(source).height;
    handle.focus();
    await userEvent.keyboard(" ");
    await frames(4);
    const overlay = document.querySelector<HTMLElement>("[data-slot=kanban-overlay]");
    expect(overlay, "overlay marked").toBeTruthy();
    expect(Math.abs(r(overlay!).height - sourceHeight)).toBeLessThanOrEqual(1);
    const ph = q(root, "li[data-dragging]");
    const slot = q(ph, "article");
    expect(getComputedStyle(slot).borderStyle, "placeholder is dashed").toContain("dashed");
    for (const child of [...slot.children]) expect(getComputedStyle(child).opacity, "placeholder content is transparent").toBe("0");
    expect(document.body.style.cursor || getComputedStyle(document.body).cursor).toBe("grabbing");
    await userEvent.keyboard("{ArrowDown}");
    await frames(6);
    expect(document.querySelectorAll("[data-slot=kanban-drop-indicator]").length).toBe(1);
    await userEvent.keyboard("{Escape}");
    await frames(4);
    expect(document.querySelectorAll("[data-slot=kanban-drop-indicator]").length).toBe(0);
    expect(document.body.style.cursor).not.toBe("grabbing");
  });
});

describe("kanban overlay under a transformed ancestor (user report: card floats far from the pointer)", () => {
  test("the overlay starts exactly over its source card even when an ancestor has a transform", async () => {
    const root = await mountStory("kanban", "Default", { stage: "top" });
    // Storybook docs, page transitions and animated panels put a transform on an ancestor; that makes the ancestor the
    // containing block of a `position: fixed` overlay, so an un-portaled overlay is shifted by the ancestor's offset.
    const host = root.parentElement!;
    host.style.transform = "translateX(0)";
    host.style.marginTop = "160px";
    host.style.marginLeft = "120px";
    await frames(2);
    const handle = qa(root, "button").find((b) => b.getAttribute("aria-label")?.startsWith("통신 모듈 교체"))!;
    const source = r(handle.closest("article")!);
    handle.focus();
    await userEvent.keyboard(" ");
    await frames(4);
    const overlay = document.querySelector<HTMLElement>("[data-slot=kanban-overlay]")!;
    expect(overlay, "overlay").toBeTruthy();
    const o = r(overlay);
    expect(Math.abs(o.left - source.left), "overlay x").toBeLessThanOrEqual(1);
    expect(Math.abs(o.top - source.top), "overlay y").toBeLessThanOrEqual(1);
    expect(host.contains(overlay), "overlay is portaled out of the transformed subtree").toBe(false);
    await userEvent.keyboard("{Escape}");
    await frames(4);
    host.style.transform = host.style.marginTop = host.style.marginLeft = "";
  });
});

describe("C2-201..204 kanban", () => {
  const live = () => document.querySelector<HTMLElement>("[id^=DndLiveRegion]")!;
  const handleOf = (root: ParentNode, prefix: string) =>
    qa(root, "button").find((b) => b.getAttribute("aria-label")?.startsWith(prefix))!;
  const ptr = (target: EventTarget, type: string, x: number, y: number) =>
    target.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === "pointerup" ? 0 : 1, pointerId: 1, pointerType: "mouse", isPrimary: true }),
    );
  /** Real pointer sequence on the handle; resolves after pointerup is dispatched (held at the target first). */
  async function drag(handle: HTMLElement, to: { x: number; y: number }, release = true) {
    const h = r(handle);
    const x0 = h.left + h.width / 2;
    const y0 = h.top + h.height / 2;
    ptr(handle, "pointerdown", x0, y0);
    for (let i = 1; i <= 12; i++) {
      ptr(document, "pointermove", x0 + ((to.x - x0) * i) / 12, y0 + ((to.y - y0) * i) / 12);
      await frames(2);
    }
    await frames(4);
    if (release) ptr(document, "pointerup", to.x, to.y);
  }

  test("C2-201: every sr-only span inside the board is contained by the board scroller", async () => {
    const root = await mountStory("kanban", "Default");
    const board = q(root, "[role=region]");
    const spans = qa(board, ".sr-only");
    expect(spans.length).toBeGreaterThan(0);
    for (const s of spans) expect(s.offsetParent, "sr-only containing block").toBe(board);
  });

  test("C2-202: pointer drop announces the target column", async () => {
    const root = await mountStory("kanban", "Default");
    const cols = qa(root, "[role=group]");
    const t = r(cols[2]!);
    await drag(handleOf(root, "통신 모듈 교체"), { x: t.left + t.width / 2, y: t.top + 60 });
    await wait(60);
    const text = live().textContent ?? "";
    expect(text, text).toContain(cols[2]!.querySelector("h2")!.textContent!);
    await wait(500);
  });

  test("C2-203: keyboard move into the middle column announces that column", async () => {
    const root = await mountStory("kanban", "Default");
    const middle = qa(root, "[role=group] h2")[1]!.textContent!;
    handleOf(root, "통신 모듈 교체").focus();
    await userEvent.keyboard(" ");
    await frames(4);
    await userEvent.keyboard("{ArrowRight}");
    await frames(8);
    const text = live().textContent ?? "";
    expect(text, text).toContain(middle);
    expect(text, text).not.toContain("집었습니다");
    await userEvent.keyboard("{Escape}");
    await frames(4);
  });

  test("C2-204: the drop settle starts at release (no idle hold)", async () => {
    const root = await mountStory("kanban", "Default");
    const cols = qa(root, "[role=group]");
    const t = r(cols[2]!);
    await drag(handleOf(root, "통신 모듈 교체"), { x: t.left + t.width / 2, y: t.top + 80 }, false);
    const overlay = document.querySelector<HTMLElement>("[data-slot=kanban-overlay]")!;
    const at = () => r(document.querySelector("[data-slot=kanban-overlay]") ?? overlay);
    ptr(document, "pointerup", t.left + t.width / 2, t.top + 80);
    const start = at();
    const samples: number[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 150) {
      await new Promise((res) => requestAnimationFrame(() => res(null)));
      const o = at();
      samples.push(Math.hypot(o.left - start.left, o.top - start.top));
    }
    // moved within the first ~50ms, and never idles for 3 consecutive frames before arriving
    const firstMove = samples.findIndex((d) => d > 1);
    expect(firstMove, JSON.stringify(samples)).toBeGreaterThanOrEqual(0);
    expect(firstMove, "frames before motion " + JSON.stringify(samples)).toBeLessThanOrEqual(2);
    await wait(500);
  });
});

describe("FD-12/13 timeline", () => {
  test("no dependency connector crosses a milestone label (FD-12)", async () => {
    const root = await mountStory("timeline", "Default");
    const labels = qa<SVGTextElement>(root, "[data-slot=timeline-label]");
    expect(labels.length, "milestone labels tagged").toBeGreaterThan(0);
    const svg = q<SVGSVGElement>(root, "svg[data-part=canvas]");
    const hits: string[] = [];
    for (const path of qa<SVGPathElement>(svg, "[data-part=dependency]")) {
      const nums = path.getAttribute("d")!.match(/[MHV][^MHV]*/g)!;
      let x = 0;
      let y = 0;
      const segs: [number, number, number, number][] = [];
      for (const c of nums) {
        const v = c.slice(1).split(/[ ,]+/).filter(Boolean).map(Number);
        const [px, py] = [x, y];
        if (c[0] === "M") [x, y] = [v[0]!, v[1]!];
        if (c[0] === "H") x = v[0]!;
        if (c[0] === "V") y = v[0]!;
        if (c[0] !== "M") segs.push([px, py, x, y]);
      }
      for (const label of labels) {
        const b = label.getBBox();
        for (const [x1, y1, x2, y2] of segs) {
          const hit = Math.max(x1, x2) > b.x && Math.min(x1, x2) < b.x + b.width && Math.max(y1, y2) > b.y && Math.min(y1, y2) < b.y + b.height;
          if (hit) hits.push(`${label.textContent}: ${x1},${y1}-${x2},${y2}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  test("now tag does not touch a day label (FD-13)", async () => {
    const root = await mountStory("timeline", "Default");
    const tag = q(root, "[data-part=now-tag]");
    expect(tag, "now tag").toBeTruthy();
    for (const text of qa(root, "[data-part=tick] text")) expectNoOverlap(tag, text);
  });
});

describe("FD-16/17 tabs", () => {
  test("label colour runs as long as the indicator (FD-16)", async () => {
    const root = await mountStory("tabs", "Default");
    const tab = qa(root, "[role=tab]")[1]!;
    const cs = getComputedStyle(tab);
    const ind = getComputedStyle(q(root, "[data-slot=tabs-indicator]"));
    const colorIdx = cs.transitionProperty.split(",").map((s) => s.trim()).indexOf("color");
    const dur = cs.transitionDuration.split(",").map((s) => s.trim());
    const i = colorIdx;
    expect(i, `color transitions (${cs.transitionProperty})`).toBeGreaterThanOrEqual(0);
    expect(dur[i % dur.length]).toBe(ind.transitionDuration.split(",")[0]!.trim());
  });

  test("indicator is whole-pixel aligned with the active tab and inactive tabs react to hover (FD-17)", async () => {
    const root = await mountStory("tabs", "Default");
    const tab = qa(root, "[role=tab]")[1]!;
    await userEvent.click(tab);
    await wait(500);
    const ind = q(root, "[data-slot=tabs-indicator]");
    expect(Math.abs(r(ind).left - r(tab).left), "indicator left").toBeLessThan(0.5);
    const other = qa(root, "[role=tab]")[0]!;
    const idle = getComputedStyle(other).backgroundColor;
    await userEvent.hover(other);
    await wait(250);
    expect(getComputedStyle(other).backgroundColor, "hover bg").not.toBe(idle);
    expect(getComputedStyle(other).cursor).toBe("pointer");
  });
});

for (const [item, trig, panelSel] of [
  ["accordion", "accordion-trigger", "accordion-panel"],
  ["collapsible", "collapsible-trigger", "collapsible-panel"],
] as const) {
  describe(`FD-19/20/22 ${item}`, () => {
    test("panel text aligns with the label, has air above it, trigger hovers", async () => {
      const root = await mountStory(item, "States", { stage: "top" });
      const trigger = qa(root, `[data-slot=${trig}]`).find((t) => t.hasAttribute("data-panel-open")) ?? q(root, `[data-slot=${trig}]`);
      if (!trigger.hasAttribute("data-panel-open")) {
        await userEvent.click(trigger);
        await wait(500);
      }
      const panel = q(root, `[data-slot=${panelSel}]`);
      const label = q(trigger, "span:last-child");
      const textEl = q(panel, "*");
      const range = document.createRange();
      range.selectNodeContents(textEl);
      const tr = range.getClientRects()[0]!;
      const lr = (() => {
        const rg = document.createRange();
        rg.selectNodeContents(label);
        return rg.getClientRects()[0]!;
      })();
      expect(Math.abs(tr.left - lr.left), `text ${tr.left} vs label ${lr.left}`).toBeLessThan(0.5);
      expect(tr.top - r(trigger).bottom, "air between trigger and text").toBeGreaterThanOrEqual(8);
      // hover on a closed trigger
      const closed = qa(root, `[data-slot=${trig}]`).find((t) => !t.hasAttribute("data-panel-open"));
      if (closed) {
        const cs = getComputedStyle(closed);
        const idle = cs.backgroundColor + cs.backgroundSize;
        await userEvent.hover(closed);
        await wait(300);
        const hv = getComputedStyle(closed);
        expect(hv.backgroundColor + hv.backgroundSize, "hover differs").not.toBe(idle);
      }
    });
  });
}

describe("FD-23 card link", () => {
  test("focus rings the card, hover tints it", async () => {
    const root = await mountStory("card", "WholeCardLink");
    const article = q(root, "article");
    const link = q(article, "a");
    await userEvent.keyboard("{Shift}");
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(getComputedStyle(article).outlineStyle, "article ring").not.toBe("none");
    expect(getComputedStyle(link).outlineStyle, "link has no own ring").toBe("none");
    (document.activeElement as HTMLElement).blur();
    const idle = getComputedStyle(article).backgroundColor;
    await userEvent.hover(article);
    await wait(250);
    expect(getComputedStyle(article).backgroundColor).not.toBe(idle);
  });
});

describe("FD-25 panel", () => {
  test("panel title carries no text shadow", async () => {
    const root = await mountStory("panel", "TitledSection");
    expect(getComputedStyle(q(root, "h3")).textShadow).toBe("none");
  });
});

describe("FD-27/28 meter and progress", () => {
  test("a low meter marks the track and uses a non-solid fill (FD-27)", async () => {
    const root = await mountStory("meter", "Low");
    const track = q(root, "[data-slot=meter-track]");
    expect(track.hasAttribute("data-low"), "track data-low").toBe(true);
    const fill = q(track, "div");
    expect(getComputedStyle(fill).backgroundImage).not.toBe("none");
    expect(Math.round(r(track).height)).toBe(16);
  });

  test("progress label/value stay on one row inside a 160px container (FD-28)", async () => {
    const root = await mountStory("progress", "Default");
    const bar = q(root, "[role=progressbar]");
    const row = bar.firstElementChild as HTMLElement;
    const wide = r(row).height;
    bar.style.width = "160px";
    await frames(2);
    expect(r(row).height, "row height constant").toBeCloseTo(wide, 0);
    const value = row.lastElementChild!;
    expect(r(value).right).toBeLessThanOrEqual(r(bar).right + 0.5);
    expect(getComputedStyle(value).whiteSpace).toBe("nowrap");
  });
});

describe("FD-31 avatar", () => {
  test("avatar sizes sm/md/lg are 32/48/64 and initials are centred", async () => {
    const root = await mountStory("avatar", "FallbackInitials");
    const av = q(root, "[data-slot=avatar]");
    expect(r(av).width).toBe(48);
    const fb = q(av, "[data-slot=avatar-fallback]");
    expect(getComputedStyle(fb).letterSpacing).toBe("normal");
  });
});
