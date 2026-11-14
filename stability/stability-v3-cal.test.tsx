import { useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import "./mount"; // storybook project annotations + css
import { frames } from "./mount";
import { Calendar, type DateRange } from "../registry/yorha/ui/calendar/calendar";
import { expectAnchoredBelow, expectGrid, expectPixelSnapped, expectSameHeight, expectWithinViewport } from "../.storybook/geometry";
import { DatePicker, DateRangePicker } from "../registry/yorha/ui/date-picker/date-picker";
import { DateInput } from "../registry/yorha/ui/date-input/date-input";

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
/** The InputGroup frame of the pickers and DateInput. */
const FRAME = "[data-slot=input-group]";
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

  it("FCAL-18: showToday adds one control row and its 1px rule", async () => {
    const C = controlSm();
    const c = await render(<Calendar today={TODAY} bordered={false} showToday />);
    expect(rect(q("[data-slot=calendar]", c)!).height).toBe(16 + C + 24 + 6 * C + C + 1);
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

/** Open animations are motion, not layout: wait for finite animations to finish before measuring the resting box. */
const settled = async () => {
  await frames(2);
  await Promise.allSettled(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map((a) => a.finished));
  await frames(2);
};

const until = async (fn: () => boolean, ms = 3000) => {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`timeout waiting for ${fn.toString().slice(0, 80)}`);
};
/** `--yorha-control-md` in px, measured through a real element. */
function controlMd(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "height:var(--yorha-control-md);width:1px;position:absolute";
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}

describe("date picker field and popup (FCAL-04, 05, 06, 07, 19, 20)", () => {
  it("FCAL-04/20/19: one frame of control-md height; input and trigger are equal, the trigger sits inside the frame, icon is CalendarIcon", async () => {
    const c = await render(<DatePicker label="출발일" today={TODAY} />);
    const frame = q(FRAME, c)!;
    const input = q("input[data-date-input]", c)!;
    const trigger = q("[data-slot=input-group-button]", c)!;
    expect(rect(frame).height).toBe(controlMd());
    expectSameHeight(input, trigger);
    expect(rect(trigger).width).toBe(rect(trigger).height);
    expect(rect(trigger).right).toBeLessThanOrEqual(rect(frame).right);
    expect(rect(trigger).top).toBeGreaterThanOrEqual(rect(frame).top);
    const svg = q("svg", trigger)!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(trigger.getAttribute("aria-label")).toBe("달력 열기");
    expectPixelSnapped(frame, { axes: "xy" });
  });

  it("FCAL-05: a disabled picker looks disabled (cursor, colour) and keeps its geometry", async () => {
    const a = await render(<DatePicker label="가" today={TODAY} />);
    const b = await render(<DatePicker label="나" today={TODAY} disabled />);
    const on = q("[data-slot=input-group-button]", a)!;
    const off = q("[data-slot=input-group-button]", b)!;
    expect(off.hasAttribute("disabled")).toBe(true);
    expect(getComputedStyle(off).cursor).toBe("not-allowed");
    expect(getComputedStyle(off).color).not.toBe(getComputedStyle(on).color);
    expect(rect(off).height).toBe(rect(on).height);
    expect(rect(q(FRAME, b)!).height).toBe(rect(q(FRAME, a)!).height);
  });

  it("FCAL-06/07: the popup opens below the field, start-aligned, 8px gap, inside the viewport and content-wide", async () => {
    const c = await render(<DatePicker label="출발일" today={TODAY} />);
    await userEvent.click(q("[data-slot=input-group-button]", c)!);
    await until(() => !!q("[data-slot=popover-content] [data-slot=calendar]"));
    await frames(8);
    await settled();
    const popup = q("[data-slot=popover-content]")!;
    const frame = q(FRAME, c)!;
    expectAnchoredBelow(popup, frame, { gap: 8, align: "start" });
    expectWithinViewport(popup, 8);
    expectGrid(qa("[data-slot=popover-content] tbody td"), { columns: 7, rows: 6 });
    const cal = rect(q("[data-slot=popover-content] [data-slot=calendar]")!);
    // popup border box = calendar + the 1px popup border on each side; no frame inside the frame
    expect(rect(popup).width).toBe(cal.width + 2);
    expect(q("[data-slot=popover-content] [data-slot=calendar-footer]")).not.toBeNull();
  });
});

describe("date range picker (FCAL-21)", () => {
  it("FCAL-21: two inputs share one frame; under 400px the end date drops to a second row inside the frame", async () => {
    const wide = await render(<DateRangePicker label="기간" today={TODAY} defaultValue={{ from: new Date(2026, 10, 14), to: new Date(2026, 10, 25) }} />, 520);
    const start = q<HTMLInputElement>("input[aria-label=시작일]", wide)!;
    const end = q<HTMLInputElement>("input[aria-label=종료일]", wide)!;
    expect(start.value).toBe("2026. 11. 14.");
    expect(end.value).toBe("2026. 11. 25.");
    expect(rect(start).top).toBe(rect(end).top);
    const narrow = await render(<DateRangePicker label="기간" today={TODAY} defaultValue={{ from: new Date(2026, 10, 14), to: new Date(2026, 10, 25) }} />, 300);
    const s2 = q<HTMLInputElement>("input[aria-label=시작일]", narrow)!;
    const e2 = q<HTMLInputElement>("input[aria-label=종료일]", narrow)!;
    expect(rect(e2).top).toBeGreaterThan(rect(s2).top);
    const frame = rect(q(FRAME, narrow)!);
    expect(rect(e2).bottom).toBeLessThanOrEqual(frame.bottom);
    for (const i of [s2, e2]) expect(i.scrollWidth).toBeLessThanOrEqual(i.clientWidth);
  });

  it("FCAL-21: an end before the start is invalid with its own message", async () => {
    const c = await render(<DateRangePicker label="기간" today={TODAY} defaultValue={{ from: new Date(2026, 10, 14), to: new Date(2026, 10, 25) }} />);
    const end = q<HTMLInputElement>("input[aria-label=종료일]", c)!;
    end.focus();
    await userEvent.fill(end, "2026. 11. 10.");
    await userEvent.keyboard("{Enter}");
    await until(() => !!q("[data-slot=field-error], [role=alert]", c));
    expect(c.textContent).toContain("종료일이 시작일보다 빠릅니다");
    expect(end.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("date input (FCAL-19, 25, 26)", () => {
  it("FCAL-25/26: the native indicator is hidden for every type; the end button is a frame square with the YoRHa icon", async () => {
    for (const type of ["date", "datetime-local", "month", "week", "time"] as const) {
      const c = await render(<DateInput label="값" type={type} today={TODAY} />);
      const input = q<HTMLInputElement>("input", c)!;
      // getComputedStyle on the webkit pseudo returns the host's style, so assert the class and the generated rule
      expect(input.className).toContain("[&::-webkit-calendar-picker-indicator]:hidden");
      const rules = [...document.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });
      const flat = (list: CSSRuleList | CSSRule[]): CSSRule[] => [...list].flatMap((r) => [r, ...("cssRules" in r ? flat((r as CSSGroupingRule).cssRules) : [])]);
      expect(flat(rules).some((r) => r.cssText.includes("webkit-calendar-picker-indicator") && /display:\s*none/.test(r.cssText))).toBe(true);
      const btn = q("[data-slot=input-group-button]", c)!;
      expect(rect(btn).height).toBe(rect(input).height);
      expect(rect(q(FRAME, c)!).height).toBe(controlMd());
      expect(q("svg", btn)!.getAttribute("viewBox")).toBe("0 0 16 16");
    }
  });

  it("FCAL-06/19: with picker the kit calendar opens below the field", async () => {
    const c = await render(<DateInput label="출발일" picker today={TODAY} />);
    expect(qa("[data-slot=input-group-button]", c)).toHaveLength(1);
    await userEvent.click(q("[data-slot=input-group-button]", c)!);
    await until(() => !!q("[data-slot=popover-content] [data-slot=calendar]"));
    await frames(8);
    await settled();
    expectAnchoredBelow(q("[data-slot=popover-content]")!, q(FRAME, c)!, { gap: 8, align: "start" });
  });
});

describe("calendar c2 fixes (C2-101, C2-102, C2-104)", () => {
  it("C2-101: Tab into the DateInput / DatePicker text field draws the 2px kit ring on the frame", async () => {
    for (const node of [<DateInput key="i" label="출발일" today={TODAY} />, <DatePicker key="p" label="출발일" today={TODAY} />]) {
      const c = await render(node);
      await userEvent.click(document.body);
      await userEvent.tab();
      await frames(2);
      const input = q("input", c)!;
      expect(document.activeElement).toBe(input);
      const cs = getComputedStyle(q(FRAME, c)!);
      expect(cs.outlineStyle).not.toBe("none");
      expect(parseFloat(cs.outlineWidth)).toBeGreaterThanOrEqual(2);
      (document.activeElement as HTMLElement).blur();
      mounted.splice(0).forEach((m) => {
        m.root.unmount();
        m.container.remove();
      });
    }
  });

  it("C2-102: the calendar sizes from its container, not the viewport: 200px and 280px wrappers fit, integer cells >= 24px", async () => {
    for (const w of [200, 280]) {
      // render() pads 16px per side inside a border-box width: ask for the width of the wrapper's content box
      const c = await render(<Calendar today={TODAY} />, w + 32);
      const cal = q("[data-slot=calendar]", c)!;
      expect(cal.scrollWidth, `scrollWidth @${w}`).toBeLessThanOrEqual(cal.clientWidth);
      expect(rect(cal).width, `width @${w}`).toBeLessThanOrEqual(w);
      const cells = qa("tbody td", c);
      expect(cells).toHaveLength(42);
      const cw = rect(cells[0]!).width;
      expect(cw).toBeGreaterThanOrEqual(24);
      expect(Number.isInteger(cw)).toBe(true);
      expectGrid(cells, { columns: 7, rows: 6 });
    }
  });

  it("C2-104: on a 1280x360 viewport the popup stays inside it and 오늘 stays reachable", async () => {
    await page.viewport(1280, 360);
    try {
      const c = await render(<DatePicker label="출발일" today={TODAY} />);
      await userEvent.click(q("[data-slot=input-group-button]", c)!);
      await until(() => !!q("[data-slot=popover-content] [data-slot=calendar]"));
      await frames(8);
      await settled();
      const popup = q("[data-slot=popover-content]")!;
      expectWithinViewport(popup, 8);
      const today = q("[data-slot=calendar-footer] button", popup)!;
      const pr = rect(popup);
      const tr = rect(today);
      expect(tr.top).toBeGreaterThanOrEqual(pr.top);
      expect(tr.bottom).toBeLessThanOrEqual(pr.bottom + 0.5);
    } finally {
      await page.viewport(1280, 800);
    }
  });
});
