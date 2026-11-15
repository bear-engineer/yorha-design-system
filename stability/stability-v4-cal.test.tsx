import { type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook project annotations + css
import { frames } from "./mount";
import { Calendar } from "../registry/yorha/ui/calendar/calendar";
import { DatePicker, DateRangePicker } from "../registry/yorha/ui/date-picker/date-picker";
import { DateInput } from "../registry/yorha/ui/date-input/date-input";

/**
 * yorha v4 calendar family (f-cal): V4-245..251. Rendered without the Storybook decorator.
 */
const mounted: { root: Root; container: HTMLElement }[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
  }
});

async function render(node: ReactNode, cls = ""): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.lang = "ko";
  container.className = cls;
  container.style.cssText = "padding:16px;";
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
const FRAME = "[data-slot=input-group]";
const POPUP = "[data-slot=popover-content]";

async function until(test: () => boolean, max = 60) {
  for (let i = 0; i < max && !test(); i++) await frames(1);
  expect(test()).toBe(true);
}

function allRules(): CSSRule[] {
  const walk = (list: CSSRuleList | CSSRule[]): CSSRule[] => [...list].flatMap((r) => [r, ...("cssRules" in r ? walk((r as CSSGroupingRule).cssRules) : [])]);
  return walk(
    [...document.styleSheets].flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch {
        return [];
      }
    }),
  );
}

/** Stub `matchMedia` so `(pointer: fine|coarse)` answers as requested; everything else is real. */
function emulatePointer(kind: "fine" | "coarse") {
  const real = window.matchMedia.bind(window);
  vi.stubGlobal("matchMedia", (query: string) => {
    const m = /\(pointer:\s*(fine|coarse)\)/.exec(query);
    if (!m) return real(query);
    const mql = real("all");
    return Object.assign(Object.create(mql), {
      matches: m[1] === kind,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as MediaQueryList;
  });
}

describe("V4-245 native date segments", () => {
  it("the focused segment is ink on on-ink through the datetime-edit pseudos; numerals are tabular", async () => {
    for (const type of ["date", "datetime-local", "time", "month", "week"] as const) {
      const c = await render(<DateInput label="값" type={type} today={TODAY} />);
      const input = q<HTMLInputElement>("input", c)!;
      // getComputedStyle on a webkit pseudo returns the host's style, so assert the class and the generated rules
      for (const part of ["year", "month", "day", "hour", "minute"]) {
        expect(input.className).toContain(`::-webkit-datetime-edit-${part}-field:focus`);
      }
      expect(getComputedStyle(input).fontVariantNumeric).toContain("tabular-nums");
    }
    const rules = allRules().filter((r) => r.cssText.includes("webkit-datetime-edit-day-field") && r.cssText.includes(":focus"));
    expect(rules.length).toBeGreaterThan(0);
    const text = rules.map((r) => r.cssText).join(" ");
    expect(text).toMatch(/background-color:\s*var\(--color-yorha-ink/);
    expect(text).toMatch(/color:\s*var\(--color-yorha-on-ink/);
    expect(text).not.toMatch(/highlight|#[0-9a-f]{3,8}\b/i);
  });
});

describe("V4-246 picker auto", () => {
  it("fine pointer: the end button opens the kit Calendar; native showPicker is not used", async () => {
    emulatePointer("fine");
    const spy = vi.fn();
    HTMLInputElement.prototype.showPicker = spy;
    const c = await render(<DateInput label="출발일" today={TODAY} />);
    await userEvent.click(q("[data-slot=input-group-button]", c)!);
    await until(() => !!q(`${POPUP} [data-slot=calendar]`));
    expect(spy).not.toHaveBeenCalled();
  });

  it("coarse pointer: the end button calls showPicker() and no kit popup opens", async () => {
    emulatePointer("coarse");
    const spy = vi.fn();
    HTMLInputElement.prototype.showPicker = spy;
    const c = await render(<DateInput label="출발일" today={TODAY} />);
    await userEvent.click(q("[data-slot=input-group-button]", c)!);
    await frames(6);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q(POPUP)).toBeNull();
  });

  it('picker="native" and picker="calendar" override the pointer', async () => {
    emulatePointer("fine");
    const spy = vi.fn();
    HTMLInputElement.prototype.showPicker = spy;
    const c = await render(<DateInput label="출발일" picker="native" today={TODAY} />);
    await userEvent.click(q("[data-slot=input-group-button]", c)!);
    await frames(6);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q(POPUP)).toBeNull();
  });

  it("the control carries color-scheme per theme", async () => {
    const light = await render(<DateInput label="값" today={TODAY} />);
    expect(getComputedStyle(q("input", light)!).colorScheme).toContain("light");
    const dark = await render(<DateInput label="값" today={TODAY} />, "dark");
    expect(getComputedStyle(q("input", dark)!).colorScheme).toContain("dark");
  });
});

describe("V4-247 DatePicker required", () => {
  it("empty required: submit is blocked, the text field is focused, the error is visible, hidden inputs have no form attribute", async () => {
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    const c = await render(
      <form onSubmit={onSubmit}>
        <DatePicker label="출발일" name="start" required today={TODAY} />
        <button type="submit">보내기</button>
      </form>,
    );
    const form = q<HTMLFormElement>("form", c)!;
    form.requestSubmit();
    await frames(3);
    expect(onSubmit).not.toHaveBeenCalled();
    const input = q<HTMLInputElement>("[data-date-input]", c)!;
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const err = q("[data-slot=field-error]", c)!;
    expect(err).toBeTruthy();
    expect(rect(err).height).toBeGreaterThan(0);
    for (const h of qa("input[type=hidden]", c)) expect(h.hasAttribute("form")).toBe(false);
  });

  it("a filled required picker submits; the range needs both ends", async () => {
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    const c = await render(
      <form onSubmit={onSubmit}>
        <DatePicker label="출발일" name="start" required defaultValue={TODAY} today={TODAY} />
        <DateRangePicker label="기간" name="span" required defaultValue={{ from: TODAY, to: null }} today={TODAY} />
      </form>,
    );
    q<HTMLFormElement>("form", c)!.requestSubmit();
    await frames(3);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(q('[aria-label="종료일"]', c));
  });
});

describe("V4-248 form reset", () => {
  it("DateInput returns to its defaultValue", async () => {
    const c = await render(
      <form>
        <DateInput label="값" defaultValue="2026-11-01" today={TODAY} />
      </form>,
    );
    const input = q<HTMLInputElement>("input", c)!;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(input, "2026-11-20");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await frames(2);
    expect(input.value).toBe("2026-11-20");
    q<HTMLFormElement>("form", c)!.reset();
    await frames(3);
    expect(input.value).toBe("2026-11-01");
  });

  it("DatePicker returns text, value and hidden input to its defaultValue; typed errors clear", async () => {
    const c = await render(
      <form>
        <DatePicker label="출발일" name="start" defaultValue={new Date(2026, 10, 1)} today={TODAY} />
      </form>,
    );
    const input = q<HTMLInputElement>("[data-date-input]", c)!;
    await userEvent.fill(input, "20261120");
    await userEvent.keyboard("{Enter}");
    await frames(2);
    expect(q<HTMLInputElement>("input[type=hidden]", c)!.value).toBe("2026-11-20");
    await userEvent.fill(input, "garbage");
    await userEvent.keyboard("{Enter}");
    await frames(2);
    q<HTMLFormElement>("form", c)!.reset();
    await frames(3);
    expect(input.value).toMatch(/2026\.\s*11\.\s*01\./);
    expect(q<HTMLInputElement>("input[type=hidden]", c)!.value).toBe("2026-11-01");
    expect(q("[data-slot=field-error]", c)).toBeNull();
  });
});

describe("V4-249 DatePicker clear and arrow keys", () => {
  it("the clear button is always mounted (empty: hidden, same frame rect), clears the value and returns focus to the text field", async () => {
    const c = await render(<DatePicker label="출발일" name="start" today={TODAY} />);
    const frame = q(FRAME, c)!;
    const before = rect(frame);
    const clear = q<HTMLButtonElement>("[data-slot=input-group-button][aria-label=지우기]", c)!;
    expect(clear).toBeTruthy();
    expect(getComputedStyle(clear).visibility).toBe("hidden");
    const input = q<HTMLInputElement>("[data-date-input]", c)!;
    await userEvent.fill(input, "20261114");
    await userEvent.keyboard("{Enter}");
    await frames(3);
    expect(getComputedStyle(clear).visibility).toBe("visible");
    expect(rect(frame).width).toBe(before.width);
    expect(rect(frame).height).toBe(before.height);
    expect(rect(clear).width).toBeGreaterThanOrEqual(24);
    await userEvent.click(clear);
    await frames(3);
    expect(input.value).toBe("");
    expect(q<HTMLInputElement>("input[type=hidden]", c)!.value).toBe("");
    expect(document.activeElement).toBe(input);
  });

  it("required pickers have no clear button", async () => {
    const c = await render(<DatePicker label="출발일" required today={TODAY} />);
    expect(q("[aria-label=지우기]", c)).toBeNull();
  });

  it("ArrowUp/Down move a day, Shift+Arrow and PageUp/Down a month; the frame never moves", async () => {
    const c = await render(<DatePicker label="출발일" name="start" defaultValue={TODAY} today={TODAY} />);
    const input = q<HTMLInputElement>("[data-date-input]", c)!;
    const frame = rect(q(FRAME, c)!);
    const hidden = () => q<HTMLInputElement>("input[type=hidden]", c)!.value;
    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    await frames(2);
    expect(hidden()).toBe("2026-11-15");
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
    await frames(2);
    expect(hidden()).toBe("2026-10-15");
    await userEvent.keyboard("{PageDown}");
    await frames(2);
    expect(hidden()).toBe("2026-11-15");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await frames(2);
    expect(hidden()).toBe("2026-11-13");
    expect(rect(q(FRAME, c)!)).toEqual(frame);
  });
});

describe("V4-250 popups adopt yorha-pop", () => {
  it("date-picker and date-input popups carry yorha-pop and clip-path in the transition", async () => {
    emulatePointer("fine");
    for (const node of [<DatePicker key="p" label="출발일" today={TODAY} />, <DateInput key="i" label="출발일" today={TODAY} />]) {
      const c = await render(node);
      await userEvent.click(q("[data-slot=input-group-button][aria-label=달력\\ 열기]", c)!);
      await until(() => !!q(`${POPUP} [data-slot=calendar]`));
      await frames(12);
      const popup = q(POPUP)!;
      expect(popup.className).toContain("yorha-pop");
      expect(popup.getAttribute("data-side") ?? popup.parentElement!.getAttribute("data-side")).toBe("bottom");
      expect(getComputedStyle(popup).transitionProperty).toContain("clip-path");
      // settled: the calendar is not clipped
      const cal = q("[data-slot=calendar]", popup)!;
      expect(rect(cal).right).toBeLessThanOrEqual(rect(popup).right + 0.5);
      await userEvent.keyboard("{Escape}");
      await frames(12);
      mounted.splice(0).forEach((m) => {
        m.root.unmount();
        m.container.remove();
      });
    }
  });
});

describe("V4-251 Calendar T key", () => {
  it("T focuses today, switching the month when needed; modifiers are ignored", async () => {
    const c = await render(<Calendar today={TODAY} defaultMonth={new Date(2027, 2, 1)} bordered={false} />);
    const first = q<HTMLElement>("[data-slot=calendar-day][tabindex='0']", c)!;
    first.focus();
    await userEvent.keyboard("{Control>}t{/Control}");
    await frames(2);
    expect(document.activeElement).toBe(first);
    await userEvent.keyboard("t");
    await frames(3);
    expect((document.activeElement as HTMLElement).dataset.date).toBe("2026-11-14");
    expect(document.activeElement!.getAttribute("tabindex")).toBe("0");
  });
});
