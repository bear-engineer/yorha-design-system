import { type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook project annotations + css
import { frames } from "./mount";
import { DateInput, type DateInputType } from "../registry/yorha/ui/date-input/date-input";

/**
 * yorha v4 pickers (V4-252, V4-253): every DateInput type opens a kit picker on fine pointers; the native showPicker()
 * stays for coarse pointers. Rendered without the Storybook decorator.
 */
const mounted: { root: Root; container: HTMLElement }[] = [];
const realShowPicker = HTMLInputElement.prototype.showPicker;
beforeEach(() => {
  emulatePointer("fine");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  HTMLInputElement.prototype.showPicker = realShowPicker;
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
  }
});

function emulatePointer(kind: "fine" | "coarse") {
  const real = window.matchMedia.bind(window);
  vi.stubGlobal("matchMedia", (query: string) => {
    const m = /\(pointer:\s*(fine|coarse)\)/.exec(query);
    if (!m) return real(query);
    return {
      matches: m[1] === kind,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  });
}

async function render(node: ReactNode, cls = ""): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.lang = "ko";
  container.className = cls;
  container.style.cssText = "padding:16px 16px 420px;";
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
const TODAY = new Date(2026, 10, 14); // Saturday, ISO 2026-W46
const FRAME = "[data-slot=input-group]";
const BUTTON = "[data-slot=input-group-button]";
const POPUP = "[data-slot=popover-content]";

async function until(test: () => boolean, max = 80) {
  for (let i = 0; i < max && !test(); i++) await frames(1);
  expect(test()).toBe(true);
}
async function settle() {
  await frames(40);
}

type Probe = { c: HTMLElement; input: HTMLInputElement; button: HTMLElement; changes: string[]; inputs: string[] };
async function mount(type: DateInputType, props: Record<string, unknown> = {}): Promise<Probe> {
  const c = await render(
    <form>
      <DateInput label="값" type={type} name="v" today={TODAY} {...props} />
    </form>,
  );
  const input = q<HTMLInputElement>("input[name=v]", c)!;
  const changes: string[] = [];
  const inputs: string[] = [];
  input.addEventListener("change", () => changes.push(input.value));
  input.addEventListener("input", () => inputs.push(input.value));
  return { c, input, button: q(BUTTON, c)!, changes, inputs };
}
async function open(p: Probe) {
  await userEvent.click(p.button);
  await until(() => !!q(POPUP));
  await frames(6);
}
const popup = () => q(POPUP)!;
const byText = (root: ParentNode, text: string, sel = "button") => qa(sel, root).find((b) => b.textContent?.trim() === text)!;
const option = (col: string, text: string) => byText(popup(), text, `[role=listbox][aria-label="${col}"] [role=option]`);
const day = (key: string) => q<HTMLElement>(`${POPUP} [data-date="${key}"]`)!;

const KIT: Record<DateInputType, string[]> = {
  week: ["[role=grid]"],
  month: ["[role=grid]"],
  time: ["[role=listbox]"],
  "datetime-local": ["[role=grid]", "[role=listbox]"],
  date: ["[role=grid]"],
};

describe("every type opens a kit popup on fine pointers", () => {
  for (const type of ["week", "month", "time", "datetime-local"] as const) {
    it(`${type}: kit popup, showPicker() not called; coarse pointer keeps the native picker`, async () => {
      const spy = vi.fn();
      HTMLInputElement.prototype.showPicker = spy;
      const p = await mount(type);
      await open(p);
      for (const sel of KIT[type]) expect(q(`${POPUP} ${sel}`), sel).toBeTruthy();
      expect(spy).not.toHaveBeenCalled();
      expect(popup().querySelector("input[type=week],input[type=month],input[type=time],input[type=datetime-local]")).toBeNull();
    });

    it(`${type}: coarse pointer calls showPicker() and opens nothing`, async () => {
      emulatePointer("coarse");
      const spy = vi.fn();
      HTMLInputElement.prototype.showPicker = spy;
      const p = await mount(type);
      await userEvent.click(p.button);
      await frames(6);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(q(POPUP)).toBeNull();
    });

    it(`${type}: Escape closes and returns focus to the field button`, async () => {
      const p = await mount(type);
      await open(p);
      await userEvent.keyboard("{Escape}");
      await until(() => !q(POPUP));
      expect(document.activeElement).toBe(p.button);
    });

    it(`${type}: the field rect never changes (open, close)`, async () => {
      const p = await mount(type, { defaultValue: { week: "2026-W46", month: "2026-11", time: "09:30", "datetime-local": "2026-11-14T09:30" }[type] });
      const before = rect(q(FRAME, p.c)!);
      await open(p);
      await settle();
      const during = rect(q(FRAME, p.c)!);
      await userEvent.keyboard("{Escape}");
      await until(() => !q(POPUP));
      const after = rect(q(FRAME, p.c)!);
      for (const r of [during, after]) {
        expect([r.x, r.y, r.width, r.height]).toEqual([before.x, before.y, before.width, before.height]);
      }
    });

    it(`${type}: form.reset() restores the default value`, async () => {
      const def = { week: "2026-W46", month: "2026-11", time: "09:30", "datetime-local": "2026-11-14T09:30" }[type];
      const p = await mount(type, { defaultValue: def });
      await open(p);
      await userEvent.click(byText(popup(), "지우기"));
      await until(() => !q(POPUP));
      expect(p.input.value).toBe("");
      q<HTMLFormElement>("form", p.c)!.reset();
      await frames(4);
      expect(p.input.value).toBe(def);
    });

    it(`${type}: 지우기 empties the value with one change event`, async () => {
      const def = { week: "2026-W46", month: "2026-11", time: "09:30", "datetime-local": "2026-11-14T09:30" }[type];
      const p = await mount(type, { defaultValue: def });
      await open(p);
      await userEvent.click(byText(popup(), "지우기"));
      await until(() => !q(POPUP));
      expect(p.input.value).toBe("");
      expect(p.changes).toEqual([""]);
      expect(p.inputs).toEqual([""]);
    });
  }
});

describe("week (ISO 8601)", () => {
  it("Calendar in week mode: 주 header, ISO week numbers, Monday start", async () => {
    const p = await mount("week", { defaultValue: "2026-W46" });
    await open(p);
    const head = qa("thead th", popup());
    expect(head[0]!.textContent).toBe("주");
    expect(head[1]!.textContent).toBe("월");
    expect(head).toHaveLength(8);
    const row = day("2026-11-09").closest("tr")!;
    expect(q("[data-slot=calendar-week-number]", row)!.textContent).toBe("46");
    expect(q("[data-slot=calendar-week-number]", day("2026-11-18").closest("tr")!)!.textContent).toBe("47");
  });

  it("the selected week is one ink band: all 7 days selected, edge to edge", async () => {
    const p = await mount("week", { defaultValue: "2026-W46" });
    await open(p);
    await settle();
    const keys = ["09", "10", "11", "12", "13", "14", "15"].map((d) => `2026-11-${d}`);
    for (const k of keys) expect(day(k).hasAttribute("data-selected"), k).toBe(true);
    expect(day("2026-11-16").hasAttribute("data-selected")).toBe(false);
    for (let i = 0; i < 6; i++) {
      const a = rect(day(keys[i]!)).right;
      const b = rect(day(keys[i + 1]!)).left;
      expect(Math.abs(a - b), "no gap inside the band").toBeLessThan(0.5);
      expect(getComputedStyle(day(keys[i]!), "::before").backgroundColor).toBe(getComputedStyle(day(keys[i + 1]!), "::before").backgroundColor);
    }
  });

  it("hover highlights the whole row", async () => {
    const p = await mount("week", { defaultValue: "2026-W46" });
    await open(p);
    await userEvent.hover(day("2026-11-19"));
    await frames(14);
    const row = day("2026-11-19").closest("tr")!;
    const cells = qa("td", row);
    expect(cells.length).toBeGreaterThanOrEqual(7);
    const colors = cells.map((td) => getComputedStyle(td).backgroundColor);
    for (const c of colors) expect(c, colors.join()).not.toBe("rgba(0, 0, 0, 0)");
    expect(new Set(colors).size).toBe(1);
    // another row stays transparent
    const other = getComputedStyle(qa("td", day("2026-11-25").closest("tr")!)[2]!).backgroundColor;
    expect(other).toBe("rgba(0, 0, 0, 0)");
  });

  it("picking any day writes its ISO week, fires input+change, returns focus", async () => {
    const p = await mount("week");
    await open(p);
    await userEvent.click(day("2026-11-18"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-W47");
    expect(p.changes).toEqual(["2026-W47"]);
    expect(p.inputs).toEqual(["2026-W47"]);
    expect(document.activeElement).toBe(p.button);
  });

  it("ISO week-year: 2027-01-01 belongs to 2026-W53", async () => {
    const p = await mount("week", { defaultValue: "2026-W53" });
    await open(p);
    await userEvent.click(day("2027-01-01"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-W53");
    await open(p);
    // the Monday of 2026-W53 is 2026-12-28: it opens on December
    expect(day("2026-12-28").hasAttribute("data-selected")).toBe(true);
  });

  it("keyboard: ArrowDown by week, PageDown by month, Enter picks", async () => {
    const p = await mount("week");
    await open(p);
    expect(document.activeElement).toBe(day("2026-11-14"));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(day("2026-11-21"));
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(day("2026-11-07"));
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{PageDown}");
    expect(document.activeElement).toBe(day("2026-12-28"));
    await userEvent.keyboard("{Enter}");
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-W53");
  });

  it("min/max disable whole weeks; clicking a disabled day does nothing", async () => {
    const p = await mount("week", { min: "2026-W46", max: "2026-W48" });
    await open(p);
    expect(day("2026-11-08").getAttribute("aria-disabled")).toBe("true");
    expect(day("2026-11-09").getAttribute("aria-disabled")).toBeNull();
    expect(day("2026-11-29").getAttribute("aria-disabled")).toBeNull();
    expect(day("2026-11-30").getAttribute("aria-disabled")).toBe("true");
    day("2026-11-30").click(); // a disabled control is not clickable for the driver: dispatch the event itself
    await frames(4);
    expect(q(POPUP)).toBeTruthy();
    expect(p.input.value).toBe("");
  });

  it("footer 이번 주 picks the current week", async () => {
    const p = await mount("week");
    await open(p);
    await userEvent.click(byText(popup(), "이번 주"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-W46");
    expect(p.changes).toEqual(["2026-W46"]);
  });
});

describe("month", () => {
  it("year header, 3 x 4 grid of 1월..12월, today marker, selected", async () => {
    const p = await mount("month", { defaultValue: "2026-03" });
    await open(p);
    const cells = qa("[data-slot=month-picker-month]", popup());
    expect(cells.map((b) => b.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => `${i + 1}월`));
    expect(q("[data-slot=month-picker-year]", popup())!.textContent).toBe("2026");
    expect(q("[role=grid]", popup())!.querySelectorAll("[role=row]")).toHaveLength(4);
    expect(cells[2]!.closest("[role=gridcell]")!.getAttribute("aria-selected")).toBe("true");
    expect(cells[10]!.hasAttribute("data-today")).toBe(true);
    expect(cells.filter((b) => b.hasAttribute("data-today"))).toHaveLength(1);
    // 3 per row
    expect(rect(cells[0]!).top).toBe(rect(cells[2]!).top);
    expect(rect(cells[3]!).top).toBeGreaterThan(rect(cells[0]!).top);
    // the today marker is the same 12 x 2 bar as the Calendar's
    const after = getComputedStyle(cells[10]!, "::after");
    expect([after.width, after.height]).toEqual(["12px", "2px"]);
  });

  it("picking writes YYYY-MM, fires input+change, returns focus; prev/next year", async () => {
    const p = await mount("month", { defaultValue: "2026-11" });
    await open(p);
    await userEvent.click(q("[aria-label='다음 해']", popup())!);
    await frames(4);
    expect(q("[data-slot=month-picker-year]", popup())!.textContent).toBe("2027");
    await userEvent.click(byText(popup(), "1월"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2027-01");
    expect(p.changes).toEqual(["2027-01"]);
    expect(p.inputs).toEqual(["2027-01"]);
    expect(document.activeElement).toBe(p.button);
  });

  it("keyboard: roving focus with arrows, Enter picks", async () => {
    const p = await mount("month", { defaultValue: "2026-11" });
    await open(p);
    expect(document.activeElement).toBe(byText(popup(), "11월"));
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(byText(popup(), "10월"));
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(byText(popup(), "4월"));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(byText(popup(), "5월"));
    expect(qa("[data-slot=month-picker-month][tabindex='0']", popup())).toHaveLength(1);
    // moving past December continues in the next year
    await userEvent.keyboard("{PageDown}{ArrowDown}");
    expect(q("[data-slot=month-picker-year]", popup())!.textContent).toBe("2027");
    expect(document.activeElement).toBe(byText(popup(), "8월"));
    await userEvent.keyboard("{PageUp}{ArrowLeft}{Enter}");
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-07");
  });

  it("min/max disable months and the year buttons", async () => {
    const p = await mount("month", { defaultValue: "2026-11", min: "2026-09", max: "2027-02" });
    await open(p);
    expect(byText(popup(), "8월").getAttribute("aria-disabled")).toBe("true");
    expect(byText(popup(), "9월").getAttribute("aria-disabled")).toBeNull();
    expect(q<HTMLButtonElement>("[aria-label='이전 해']", popup())!.disabled).toBe(true);
    byText(popup(), "8월").click();
    await frames(4);
    expect(p.input.value).toBe("2026-11");
    await userEvent.click(q("[aria-label='다음 해']", popup())!);
    await frames(4);
    expect(byText(popup(), "2월").getAttribute("aria-disabled")).toBeNull();
    expect(byText(popup(), "3월").getAttribute("aria-disabled")).toBe("true");
    expect(q<HTMLButtonElement>("[aria-label='다음 해']", popup())!.disabled).toBe(true);
  });

  it("footer 이번 달 picks the current month", async () => {
    const p = await mount("month", { defaultValue: "2025-01" });
    await open(p);
    await userEvent.click(byText(popup(), "이번 달"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-11");
  });
});

describe("time", () => {
  it("hour 00..23 and minute 00..59 listboxes with fixed height and inner scroll", async () => {
    const p = await mount("time", { defaultValue: "09:30" });
    await open(p);
    const hours = qa("[role=listbox][aria-label='시'] [role=option]", popup());
    const minutes = qa("[role=listbox][aria-label='분'] [role=option]", popup());
    expect(hours).toHaveLength(24);
    expect(minutes).toHaveLength(60);
    expect(q("[role=listbox][aria-label='초']", popup())).toBeNull();
    const lb = q("[role=listbox][aria-label='분']", popup())!;
    expect(lb.scrollHeight).toBeGreaterThan(lb.clientHeight);
    expect(getComputedStyle(lb).overflowY).toBe("auto");
    expect(hours[9]!.getAttribute("aria-selected")).toBe("true");
    expect(minutes[30]!.getAttribute("aria-selected")).toBe("true");
  });

  it("the selected option is scrolled into view without moving the popup", async () => {
    const p = await mount("time", { defaultValue: "23:59" });
    await open(p);
    const pop0 = rect(popup());
    await settle();
    for (const col of ["시", "분"]) {
      const lb = q(`[role=listbox][aria-label='${col}']`, popup())!;
      const sel = q("[aria-selected=true]", lb)!;
      expect(rect(sel).top).toBeGreaterThanOrEqual(rect(lb).top - 0.5);
      expect(rect(sel).bottom).toBeLessThanOrEqual(rect(lb).bottom + 0.5);
    }
    const pop1 = rect(popup());
    expect([pop1.x, pop1.y, pop1.width, pop1.height]).toEqual([pop0.x, pop0.y, pop0.width, pop0.height]);
    expect(window.scrollY).toBe(0);
  });

  it("keyboard: ArrowUp/Down inside a column, ArrowLeft/Right between columns, Enter commits one change", async () => {
    const p = await mount("time", { defaultValue: "09:30" });
    await open(p);
    expect(document.activeElement).toBe(option("시", "09"));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(option("시", "10"));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(option("분", "30"));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(option("분", "31"));
    expect(p.input.value).toBe("09:30"); // nothing is written before Enter
    await userEvent.keyboard("{Enter}");
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("10:31");
    expect(p.changes).toEqual(["10:31"]);
    expect(document.activeElement).toBe(p.button);
  });

  it("Tab moves between columns", async () => {
    const p = await mount("time", { defaultValue: "09:30" });
    await open(p);
    await userEvent.tab();
    expect(document.activeElement).toBe(option("분", "30"));
  });

  it("clicking options then 확인 writes HH:MM", async () => {
    const p = await mount("time");
    await open(p);
    await userEvent.click(option("시", "14"));
    await userEvent.click(option("분", "05"));
    expect(p.input.value).toBe("");
    await userEvent.click(byText(popup(), "확인"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("14:05");
  });

  it("step 300 shows 12 minute options; step < 60 adds seconds and writes HH:MM:SS", async () => {
    const p = await mount("time", { defaultValue: "09:30", step: 300 });
    await open(p);
    expect(qa("[role=listbox][aria-label='분'] [role=option]", popup())).toHaveLength(12);
    await userEvent.keyboard("{Escape}");
    await until(() => !q(POPUP));
    const s = await mount("time", { defaultValue: "09:30:00", step: 15 });
    await open(s);
    expect(qa("[role=listbox][aria-label='초'] [role=option]", popup()).map((o) => o.textContent)).toEqual(["00", "15", "30", "45"]);
    await userEvent.click(option("초", "45"));
    await userEvent.click(byText(popup(), "확인"));
    await until(() => !q(POPUP));
    expect(s.input.value).toBe("09:30:45");
  });

  it("min/max disable hours and minutes outside the range", async () => {
    const p = await mount("time", { defaultValue: "09:30", min: "09:15", max: "17:00" });
    await open(p);
    expect(option("시", "08").getAttribute("aria-disabled")).toBe("true");
    expect(option("시", "09").getAttribute("aria-disabled")).toBeNull();
    expect(option("시", "18").getAttribute("aria-disabled")).toBe("true");
    expect(option("분", "10").getAttribute("aria-disabled")).toBe("true");
    expect(option("분", "15").getAttribute("aria-disabled")).toBeNull();
    option("시", "18").click();
    await userEvent.click(byText(popup(), "확인"));
    await frames(4);
    expect(p.input.value).toBe("09:30");
  });

  it("footer 지금 writes the current time", async () => {
    const p = await mount("time");
    await open(p);
    await userEvent.click(byText(popup(), "지금"));
    await until(() => !q(POPUP));
    expect(p.input.value).toMatch(/^\d\d:\d\d$/);
    expect(p.changes).toHaveLength(1);
  });
});

describe("datetime-local", () => {
  it("Calendar and TimePicker side by side, one commit", async () => {
    const p = await mount("datetime-local", { defaultValue: "2026-11-14T09:30" });
    await open(p);
    const cal = q("[data-slot=calendar]", popup())!;
    const time = q("[data-slot=time-picker]", popup())!;
    expect(rect(time).left).toBeGreaterThanOrEqual(rect(cal).right - 0.5);
    expect(Math.abs(rect(time).top - rect(cal).top)).toBeLessThan(2);
    await userEvent.click(day("2026-11-18"));
    await userEvent.click(option("시", "14"));
    expect(p.input.value).toBe("2026-11-14T09:30");
    expect(p.changes).toEqual([]);
    await userEvent.click(byText(popup(), "확인"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-11-18T14:30");
    expect(p.changes).toEqual(["2026-11-18T14:30"]);
    expect(p.inputs).toEqual(["2026-11-18T14:30"]);
    expect(document.activeElement).toBe(p.button);
  });

  it("an empty field picks 00:00 when only a day was chosen", async () => {
    const p = await mount("datetime-local");
    await open(p);
    await userEvent.click(day("2026-11-18"));
    await userEvent.click(byText(popup(), "확인"));
    await until(() => !q(POPUP));
    expect(p.input.value).toBe("2026-11-18T00:00");
  });

  it("min/max disable days and times", async () => {
    const p = await mount("datetime-local", { defaultValue: "2026-11-14T09:30", min: "2026-11-10T00:00", max: "2026-11-20T23:59" });
    await open(p);
    expect(day("2026-11-09").getAttribute("aria-disabled")).toBe("true");
    expect(day("2026-11-21").getAttribute("aria-disabled")).toBe("true");
    expect(day("2026-11-15").getAttribute("aria-disabled")).toBeNull();
  });

  it("stacks under 420px and never overflows 320 wide", async () => {
    const p = await mount("datetime-local", { defaultValue: "2026-11-14T09:30" });
    await open(p);
    const r = rect(popup());
    expect(r.right).toBeLessThanOrEqual(window.innerWidth + 0.5);
    expect(r.left).toBeGreaterThanOrEqual(-0.5);
  });
});
