import { useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook project annotations + css
import { frames } from "./mount";
import { Calendar, type DateRange } from "../registry/yorha/ui/calendar/calendar";
import { expectGrid, expectPixelSnapped, expectSameHeight } from "../.storybook/geometry";

/**
 * yorha v3 calendar family (f-cal): geometry assertions for FCAL-01..21. Rendered without the Storybook decorator.
 * The old calendar collapsed to ONE column and every test stayed green, so everything here measures rectangles.
 */
const mounted: { root: Root; container: HTMLElement }[] = [];
afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
  }
});

async function render(node: ReactNode, width?: number): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.lang = "ko";
  container.style.cssText = `padding:16px;${width ? `width:${width}px;` : ""}`;
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  root.render(node);
  await frames(3);
  await document.fonts.ready;
  await frames(2);
  return container;
}
const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const rect = (el: Element) => el.getBoundingClientRect();
const TODAY = new Date(2026, 10, 14);
const day = (c: ParentNode, key: string) => q(`[data-date="${key}"]`, c)!;
const tdOf = (c: ParentNode, key: string) => day(c, key).closest("td")!;

/** `--yorha-control-sm` in px, measured through a real element. */
function controlSm(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "height:var(--yorha-control-sm);width:1px;position:absolute";
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}

describe("calendar month grid (FCAL-01, 02, 03, 09)", () => {
  it("FCAL-01/02: the 42 body cells are a 7 x 6 grid and every in-month button fills its td", async () => {
    const c = await render(<Calendar today={TODAY} bordered={false} />);
    const cells = qa("tbody td", c);
    expect(cells).toHaveLength(42);
    expectGrid(cells, { columns: 7, rows: 6 });
    for (const td of cells) expect(getComputedStyle(td).display).toBe("table-cell");
    for (const b of qa("button[data-slot=calendar-day]", c)) {
      const t = rect(b.closest("td")!);
      const r = rect(b);
      expect([r.left, r.top, r.width, r.height]).toEqual([t.left, t.top, t.width, t.height]);
    }
  });

  it("FCAL-01/07: same grid at a 296px column (320px viewport) and cells are the control scale", async () => {
    const c = await render(<Calendar today={TODAY} bordered={false} />, 296);
    expectGrid(qa("tbody td", c), { columns: 7, rows: 6 });
    const cell = rect(tdOf(c, "2026-11-14"));
    expect(cell.width).toBe(controlSm());
    expect(cell.height).toBe(controlSm());
    expect(cell.width).toBeGreaterThanOrEqual(24);
  });

  it("FCAL-01/09: two months are two 7 x 6 grids, header cells line up with the day cells", async () => {
    const c = await render(<Calendar today={TODAY} numberOfMonths={2} bordered={false} />);
    const months = qa("[data-slot=calendar-month]", c);
    expect(months).toHaveLength(2);
    for (const m of months) {
      expectGrid(qa("tbody td", m), { columns: 7, rows: 6 });
      const ths = qa("th", m);
      const firstRow = qa("tbody tr:first-child td", m);
      ths.forEach((th, i) => {
        expect(rect(th).left).toBe(rect(firstRow[i]!).left);
        expect(rect(th).width).toBe(rect(firstRow[i]!).width);
      });
      const table = rect(q("table", m)!);
      const title = rect(q("[data-slot=calendar-header]", m)!);
      expect([title.left, title.right]).toEqual([table.left, table.right]);
    }
  });

  it("FCAL-03/14: height is identical for Feb, Aug and Nov 2026 and equals 16 + C + 24 + 6C", async () => {
    const C = controlSm();
    const heights: number[] = [];
    for (const month of [new Date(2026, 1, 1), new Date(2026, 7, 1), new Date(2026, 10, 1)]) {
      const c = await render(<Calendar today={TODAY} defaultMonth={month} bordered={false} />);
      heights.push(rect(q("[data-slot=calendar]", c)!).height);
    }
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe(16 + C + 24 + 6 * C);
  });

  it("FCAL-18: showToday adds exactly one control row", async () => {
    const C = controlSm();
    const c = await render(<Calendar today={TODAY} bordered={false} showToday />);
    expect(rect(q("[data-slot=calendar]", c)!).height).toBe(16 + C + 24 + 6 * C + C);
  });

  it("FCAL-03: in-month cells hold one button, outside cells none and carry data-outside + a numeral", async () => {
    const c = await render(<Calendar today={TODAY} defaultMonth={new Date(2026, 10, 1)} />);
    const cells = qa("tbody td", c);
    const outside = cells.filter((td) => td.hasAttribute("data-outside"));
    const inside = cells.filter((td) => !td.hasAttribute("data-outside"));
    expect(inside).toHaveLength(30);
    expect(outside).toHaveLength(12);
    for (const td of inside) expect(qa("button[data-date]", td)).toHaveLength(1);
    for (const td of outside) {
      expect(qa("button", td)).toHaveLength(0);
      expect(td.getAttribute("aria-disabled")).toBe("true");
      expect(td.textContent?.trim()).toMatch(/^\d{1,2}$/);
    }
  });

  it("FCAL-03: showOutsideDays={false} keeps the same 42 empty cells and the same height", async () => {
    const a = await render(<Calendar today={TODAY} bordered={false} />);
    const b = await render(<Calendar today={TODAY} bordered={false} showOutsideDays={false} />);
    expect(qa("tbody td", b)).toHaveLength(42);
    expect(qa("tbody td[data-outside]", b)).toHaveLength(0);
    expect(rect(q("[data-slot=calendar]", a)!).height).toBe(rect(q("[data-slot=calendar]", b)!).height);
  });

  it("FCAL-09: first, middle and last cells sit on whole pixels", async () => {
    const c = await render(<Calendar today={TODAY} />);
    const cells = qa("tbody td", c);
    for (const td of [cells[0]!, cells[20]!, cells[41]!]) expectPixelSnapped(td, { axes: "xy" });
  });
});

describe("calendar states (FCAL-11, 12, 15, 17)", () => {
  it("FCAL-17: day names are the full date, today ends with 오늘", async () => {
    const c = await render(<Calendar today={TODAY} />);
    expect(day(c, "2026-11-14").getAttribute("aria-label")).toContain("2026년 11월 14일 토요일");
    expect(day(c, "2026-11-14").getAttribute("aria-label")).toMatch(/오늘$/);
    expect(day(c, "2026-11-13").getAttribute("aria-label")).not.toMatch(/오늘/);
  });

  it("FCAL-11: the today bar and the renderDay row never intersect; the numeral does not move", async () => {
    const c = await render(
      <Calendar today={TODAY} renderDay={(d) => (d.getDate() === 14 || d.getDate() === 13 ? <i style={{ width: 4, height: 4, background: "currentColor" }} /> : null)} />,
    );
    const btn = day(c, "2026-11-14");
    const extra = q("[data-slot=calendar-day-extra]", btn)!;
    const bottom = rect(btn).bottom;
    // today bar: ::after, bottom 6px, height 2px; extra row: bottom 2px, height 4px
    const bar = { top: bottom - 8, bottom: bottom - 6 };
    const e = rect(extra);
    expect(e.top >= bar.bottom || e.bottom <= bar.top).toBe(true);
    const withExtras = rect(q("[data-slot=calendar-day-number]", day(c, "2026-11-13"))!);
    const without = rect(q("[data-slot=calendar-day-number]", day(c, "2026-11-12"))!);
    expect([withExtras.height, withExtras.width]).toEqual([without.height, without.width]);
    expect(withExtras.top - rect(day(c, "2026-11-13")).top).toBe(without.top - rect(day(c, "2026-11-12")).top);
  });

  it("FCAL-12: disabled differs from outside (strike, cursor), does not react to hover, is skipped by arrows", async () => {
    const c = await render(<Calendar today={TODAY} isDateDisabled={(d) => d.getDate() === 15} />);
    const dis = day(c, "2026-11-15");
    expect(dis.getAttribute("aria-disabled")).toBe("true");
    expect(getComputedStyle(dis).cursor).toBe("not-allowed");
    const num = q("[data-slot=calendar-day-number]", dis)!;
    expect(getComputedStyle(num).textDecorationLine).toBe("line-through");
    const before = getComputedStyle(dis).backgroundColor;
    await userEvent.hover(dis);
    expect(getComputedStyle(dis).backgroundColor).toBe(before);

    const outsideTd = qa("tbody td[data-outside]", c)[0]!;
    const outsideNum = outsideTd.querySelector("span")!;
    expect(getComputedStyle(outsideNum).textDecorationLine).toBe("none");
    expect(getComputedStyle(outsideTd).cursor).toBe("default");
    const inNum = rect(q("[data-slot=calendar-day-number]", day(c, "2026-11-13"))!);
    const outRect = rect(outsideNum);
    expect([outRect.width, outRect.height]).toEqual([inNum.width, inNum.height]);

    day(c, "2026-11-14").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect((document.activeElement as HTMLElement).dataset.date).toBe("2026-11-16");
  });

  it("FCAL-15: hover, press, focus, select and a pointer month change keep the calendar, nav and first cell rects", async () => {
    const c = await render(<Calendar today={TODAY} showToday />);
    const snap = () => [q("[data-slot=calendar]", c)!, q("[data-slot=calendar-prev]", c)!, q("[data-slot=calendar-next]", c)!, qa("tbody td", c)[0]!].map((el) => JSON.stringify(rect(el).toJSON()));
    const before = snap();
    const d = day(c, "2026-11-20");
    await userEvent.hover(d);
    expect(snap()).toEqual(before);
    d.focus();
    expect(snap()).toEqual(before);
    await userEvent.click(d);
    expect(d.closest("td")!.getAttribute("aria-selected")).toBe("true");
    expect(snap()).toEqual(before);
    await userEvent.click(q("[data-slot=calendar-next]", c)!);
    await frames(25);
    expect(snap().slice(0, 3)).toEqual(before.slice(0, 3));
    day(c, "2026-12-10").focus();
    await userEvent.keyboard("{PageUp}");
    await frames(5);
    expect(snap().slice(0, 3)).toEqual(before.slice(0, 3));
  });
});

describe("calendar range (FCAL-08)", () => {
  function Range({ initial }: { initial?: DateRange }) {
    const [v, setV] = useState<DateRange>(initial ?? { from: null, to: null });
    return <Calendar mode="range" today={TODAY} value={v} onValueChange={setV} bordered={false} showToday />;
  }

  it("FCAL-08: after a start, hovering day N marks exactly N - start cells and none after leaving; arrows do the same", async () => {
    const c = await render(<Range />);
    await userEvent.click(day(c, "2026-11-10"));
    await userEvent.hover(day(c, "2026-11-15"));
    expect(qa("td[data-preview]", c)).toHaveLength(5);
    await userEvent.hover(day(c, "2026-11-12"));
    expect(qa("td[data-preview]", c)).toHaveLength(2);
    await userEvent.unhover(q("table", c)!);
    expect(qa("td[data-preview]", c)).toHaveLength(0);
    // keyboard
    day(c, "2026-11-10").focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(qa("td[data-preview]", c)).toHaveLength(3);
    expect(c.textContent).toContain("종료일 선택");
  });

  it("FCAL-08: the committed band marks start, end and the cells between and has no gaps inside a week", async () => {
    const c = await render(
      <Range initial={{ from: new Date(2026, 10, 9), to: new Date(2026, 10, 18) }} />,
    );
    expect(day(c, "2026-11-09").hasAttribute("data-range-start")).toBe(true);
    expect(day(c, "2026-11-18").hasAttribute("data-range-end")).toBe(true);
    const band = qa("td[data-in-range]", c);
    expect(band).toHaveLength(8);
    expect(getComputedStyle(band[0]!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    for (const row of qa("tbody tr", c)) {
      const marked = qa("td", row).filter((td) => td.hasAttribute("data-in-range") || td.querySelector("[data-range-start],[data-range-end]"));
      for (let i = 1; i < marked.length; i++) expect(rect(marked[i - 1]!).right).toBe(rect(marked[i]!).left);
    }
  });
});

describe("calendar header (FCAL-09, 13)", () => {
  it("FCAL-13: title left, prev and next together on the right, nav buttons are control-sm squares", async () => {
    const c = await render(<Calendar today={TODAY} />);
    const title = rect(q("[id$='title-0']", c) ?? q("[data-slot=calendar-header] [aria-live]", c)!);
    const prev = q("[data-slot=calendar-prev]", c)!;
    const next = q("[data-slot=calendar-next]", c)!;
    expect(title.right).toBeLessThanOrEqual(rect(prev).left);
    expect(rect(prev).right).toBe(rect(next).left);
    expectSameHeight(prev, next);
    expect(rect(prev).width).toBe(rect(prev).height);
    expect(rect(prev).height).toBe(controlSm());
    expect(getComputedStyle(q("[data-slot=calendar-header] [aria-live]", c)!).textTransform).toBe("none");
    expect(q("svg", prev)).not.toBeNull();
  });
});
