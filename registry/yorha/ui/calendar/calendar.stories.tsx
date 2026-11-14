import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { Calendar, getWeekStart, type CalendarSingleProps, type DateRange } from "./calendar";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };

/** 2026-11-14 is a Saturday. */
const TODAY = new Date(2026, 10, 14);

// --- helpers ---
const cellOf = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-date="${key}"]`)!;
/** Tab through the header buttons until the roving day has focus. */
async function tabToGrid() {
  for (let i = 0; i < 6 && !(document.activeElement as HTMLElement | null)?.dataset.date; i++) await userEvent.tab();
}
const activeKey = () => (document.activeElement as HTMLElement | null)?.dataset.date;
const gridNames = (root: HTMLElement) =>
  within(root)
    .getAllByRole("grid")
    .map((g) => document.getElementById(g.getAttribute("aria-labelledby") ?? "")?.textContent ?? "");
async function inMotion(mode: "reduced" | "off", run: () => Promise<void>) {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  try {
    await run();
  } finally {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  }
}
const durationsMs = (el: Element) =>
  getComputedStyle(el)
    .transitionDuration.split(",")
    .map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000));

const meta = {
  title: "컴포넌트/날짜/Calendar",
  // the props are a union (single | range); stories type against the single branch and cast range args
  component: Calendar as React.ComponentType<CalendarSingleProps>,
  tags: ["autodocs"],
  args: { today: TODAY },
  decorators: [
    (Story) => (
      <div lang="ko" className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<CalendarSingleProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const grid = c.getByRole("grid", { name: "2026년 11월" });
    await expect(grid).toBeInTheDocument();
    const today = cellOf(canvasElement, "2026-11-14");
    await expect(today).toHaveAttribute("aria-current", "date");
    await expect(canvasElement.querySelectorAll("[aria-current='date']")).toHaveLength(1);
    await expect(today).toHaveTextContent("14");
    // exactly one tab stop in the grid (roving tabindex)
    await expect(canvasElement.querySelectorAll("[role=gridcell][tabindex='0']")).toHaveLength(1);
    await expect(today).toHaveAttribute("tabindex", "0");
    // week starts per locale (Intl weekInfo, Monday fallback)
    const first = canvasElement.querySelector("thead th")!;
    const start = getWeekStart("ko-KR");
    const expected = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(2023, 0, 1 + start));
    await expect(first).toHaveTextContent(expected);
  },
};

export const KeyboardNavigation: Story = {
  args: { weekStartsOn: 1 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await tabToGrid();
    await expect(activeKey()).toBe("2026-11-14");
    await userEvent.keyboard("{ArrowRight}");
    await expect(activeKey()).toBe("2026-11-15");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(activeKey()).toBe("2026-11-14");
    await userEvent.keyboard("{ArrowDown}");
    await expect(activeKey()).toBe("2026-11-21");
    await userEvent.keyboard("{ArrowUp}");
    await expect(activeKey()).toBe("2026-11-14");
    // week starts on Monday here: Sat 14 -> Home Mon 9, End Sun 15
    await userEvent.keyboard("{Home}");
    await expect(activeKey()).toBe("2026-11-09");
    await userEvent.keyboard("{End}");
    await expect(activeKey()).toBe("2026-11-15");
    await userEvent.keyboard("{ArrowLeft}");
    // only the focused day is a tab stop
    await expect(cellOf(canvasElement, "2026-11-14")).toHaveAttribute("tabindex", "0");
    await expect(cellOf(canvasElement, "2026-11-15")).toHaveAttribute("tabindex", "-1");
    // month
    await userEvent.keyboard("{PageDown}");
    await waitFor(() => expect(c.getByRole("grid", { name: "2026년 12월" })).toBeInTheDocument());
    await waitFor(() => expect(activeKey()).toBe("2026-12-14"));
    await userEvent.keyboard("{PageUp}");
    await waitFor(() => expect(c.getByRole("grid", { name: "2026년 11월" })).toBeInTheDocument());
    await waitFor(() => expect(activeKey()).toBe("2026-11-14"));
    // year
    await userEvent.keyboard("{Shift>}{PageDown}{/Shift}");
    await waitFor(() => expect(c.getByRole("grid", { name: "2027년 11월" })).toBeInTheDocument());
    await waitFor(() => expect(activeKey()).toBe("2027-11-14"));
    await userEvent.keyboard("{Shift>}{PageUp}{/Shift}");
    await waitFor(() => expect(c.getByRole("grid", { name: "2026년 11월" })).toBeInTheDocument());
    await waitFor(() => expect(activeKey()).toBe("2026-11-14"));
    // arrows cross month boundaries
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    await waitFor(() => expect(c.getByRole("grid", { name: "2026년 12월" })).toBeInTheDocument());
    await expect(activeKey()).toBe("2026-12-05");
  },
};

export const DisabledDaysSkipped: Story = {
  args: { onValueChange: fn(), weekStartsOn: 1, minDate: new Date(2026, 10, 10), maxDate: new Date(2026, 10, 20), isDateDisabled: (d: Date) => d.getDate() === 15 || d.getDate() === 16 },
  play: async ({ canvasElement, args }) => {
    await tabToGrid();
    await expect(activeKey()).toBe("2026-11-14");
    await userEvent.keyboard("{ArrowRight}");
    await expect(activeKey()).toBe("2026-11-17");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(activeKey()).toBe("2026-11-14");
    // 21 is past maxDate and 7 is before minDate: no enabled target, focus stays
    await userEvent.keyboard("{ArrowDown}");
    await expect(activeKey()).toBe("2026-11-14");
    await userEvent.keyboard("{ArrowUp}");
    await expect(activeKey()).toBe("2026-11-14");
    const disabled = cellOf(canvasElement, "2026-11-15");
    await expect(disabled).toHaveAttribute("aria-disabled", "true");
    await expect(disabled).toHaveAttribute("tabindex", "-1");
    await userEvent.click(disabled);
    await expect(disabled).toHaveAttribute("aria-selected", "false");
    await expect(args.onValueChange).not.toHaveBeenCalled();
    // minDate / maxDate disable the whole day
    await expect(cellOf(canvasElement, "2026-11-09")).toHaveAttribute("aria-disabled", "true");
    await expect(cellOf(canvasElement, "2026-11-21")).toHaveAttribute("aria-disabled", "true");
    await expect(within(canvasElement).getByRole("button", { name: "이전 달" })).toBeDisabled();
    await expect(within(canvasElement).getByRole("button", { name: "다음 달" })).toBeDisabled();
  },
};

export const SingleSelection: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(cellOf(canvasElement, "2026-11-20"));
    await expect(cellOf(canvasElement, "2026-11-20")).toHaveAttribute("aria-selected", "true");
    await expect(args.onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({}));
    const called = (args.onValueChange as ReturnType<typeof fn>).mock.calls.at(-1)![0] as Date;
    await expect([called.getFullYear(), called.getMonth(), called.getDate()]).toEqual([2026, 10, 20]);
    // keyboard: move and select with Enter, then Space
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await expect(cellOf(canvasElement, "2026-11-21")).toHaveAttribute("aria-selected", "true");
    await expect(cellOf(canvasElement, "2026-11-20")).toHaveAttribute("aria-selected", "false");
    await userEvent.keyboard("{ArrowRight} ");
    await expect(cellOf(canvasElement, "2026-11-22")).toHaveAttribute("aria-selected", "true");
  },
};

function ControlledDemo() {
  const [value, setValue] = React.useState<Date | null>(new Date(2026, 10, 3));
  return (
    <div className="grid gap-3">
      <Calendar today={TODAY} value={value} onValueChange={setValue} />
      <output data-testid="value" className="font-yorha text-yorha-sm">
        {value ? value.toISOString().slice(0, 10) : "없음"}
      </output>
    </div>
  );
}
export const Controlled: Story = {
  render: () => <ControlledDemo />,
  play: async ({ canvasElement }) => {
    await expect(cellOf(canvasElement, "2026-11-03")).toHaveAttribute("aria-selected", "true");
    await userEvent.click(cellOf(canvasElement, "2026-11-09"));
    await expect(within(canvasElement).getByTestId("value")).toHaveTextContent("2026-11-");
    await expect(cellOf(canvasElement, "2026-11-09")).toHaveAttribute("aria-selected", "true");
    await expect(cellOf(canvasElement, "2026-11-03")).toHaveAttribute("aria-selected", "false");
  },
};

/** Fixed `value` without a handler change: the selection must not move (controlled). */
export const ControlledIgnoresClicks: Story = {
  args: { value: new Date(2026, 10, 3), onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(cellOf(canvasElement, "2026-11-09"));
    await expect(args.onValueChange).toHaveBeenCalledTimes(1);
    await expect(cellOf(canvasElement, "2026-11-03")).toHaveAttribute("aria-selected", "true");
    await expect(cellOf(canvasElement, "2026-11-09")).toHaveAttribute("aria-selected", "false");
  },
};

export const RangeSelection: Story = {
  args: { mode: "range", onValueChange: fn() } as never,
  play: async ({ canvasElement, args }) => {
    const spy = args.onValueChange as unknown as ReturnType<typeof fn>;
    await userEvent.click(cellOf(canvasElement, "2026-11-10"));
    await expect(cellOf(canvasElement, "2026-11-10")).toHaveAttribute("aria-selected", "true");
    await expect(cellOf(canvasElement, "2026-11-12")).toHaveAttribute("aria-selected", "false");
    await userEvent.click(cellOf(canvasElement, "2026-11-15"));
    for (const day of ["10", "11", "12", "13", "14", "15"]) {
      await expect(cellOf(canvasElement, `2026-11-${day}`)).toHaveAttribute("aria-selected", "true");
    }
    await expect(cellOf(canvasElement, "2026-11-11")).toHaveAttribute("data-in-range");
    await expect(cellOf(canvasElement, "2026-11-10")).toHaveAttribute("data-range-start");
    await expect(cellOf(canvasElement, "2026-11-15")).toHaveAttribute("data-range-end");
    await expect(cellOf(canvasElement, "2026-11-16")).toHaveAttribute("aria-selected", "false");
    const last = spy.mock.calls.at(-1)![0] as DateRange;
    await expect([last.from?.getDate(), last.to?.getDate()]).toEqual([10, 15]);
    // third click starts over; a click before the start swaps the ends
    await userEvent.click(cellOf(canvasElement, "2026-11-20"));
    await expect(cellOf(canvasElement, "2026-11-12")).toHaveAttribute("aria-selected", "false");
    await userEvent.click(cellOf(canvasElement, "2026-11-18"));
    const swapped = spy.mock.calls.at(-1)![0] as DateRange;
    await expect([swapped.from?.getDate(), swapped.to?.getDate()]).toEqual([18, 20]);
    await expect(cellOf(canvasElement, "2026-11-19")).toHaveAttribute("data-in-range");
  },
};

export const RangeControlled: Story = {
  args: { mode: "range", value: { from: new Date(2026, 10, 2), to: new Date(2026, 10, 4) } } as never,
  play: async ({ canvasElement }) => {
    await expect(cellOf(canvasElement, "2026-11-03")).toHaveAttribute("data-in-range");
    await expect(cellOf(canvasElement, "2026-11-04")).toHaveAttribute("aria-selected", "true");
  },
};

export const TwoMonths: Story = {
  args: { numberOfMonths: 2, weekStartsOn: 1 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(gridNames(canvasElement)).toEqual(["2026년 11월", "2026년 12월"]);
    await expect(canvasElement.querySelectorAll("[role=gridcell][tabindex='0']")).toHaveLength(1);
    // header buttons are at least 24px
    const next = c.getByRole("button", { name: "다음 달" });
    const rect = next.getBoundingClientRect();
    await expect(rect.width).toBeGreaterThanOrEqual(24);
    await expect(rect.height).toBeGreaterThanOrEqual(24);
    await userEvent.click(next);
    await waitFor(() => expect(gridNames(canvasElement)).toEqual(["2026년 12월", "2027년 1월"]));
    await userEvent.click(c.getByRole("button", { name: "이전 달" }));
    await waitFor(() => expect(gridNames(canvasElement)).toEqual(["2026년 11월", "2026년 12월"]));
    // keyboard from the first grid into the second
    await userEvent.click(cellOf(canvasElement, "2026-11-30"));
    await userEvent.keyboard("{ArrowRight}");
    await expect(activeKey()).toBe("2026-12-01");
  },
};

export const HeaderNavigation: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "다음 달" }));
    await waitFor(() => expect(c.getByRole("grid", { name: "2026년 12월" })).toBeInTheDocument());
    await userEvent.click(c.getByRole("button", { name: "이전 달" }));
    await userEvent.click(c.getByRole("button", { name: "이전 달" }));
    await waitFor(() => expect(c.getByRole("grid", { name: "2026년 10월" })).toBeInTheDocument());
    // the roving tab stop follows the visible month
    await expect(canvasElement.querySelectorAll("[role=gridcell][tabindex='0']")).toHaveLength(1);
  },
};

export const RenderDay: Story = {
  args: {
    renderDay: (date: Date) =>
      date.getDate() % 7 === 0 ? <span data-testid="dot" className="size-1 bg-current" /> : null,
    getDayLabelSuffix: (date: Date) => (date.getDate() % 7 === 0 ? "일정 있음" : undefined),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByTestId("dot")).toHaveLength(4);
    await expect(cellOf(canvasElement, "2026-11-07")).toHaveTextContent("일정 있음");
    await expect(cellOf(canvasElement, "2026-11-08")).not.toHaveTextContent("일정");
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    await inMotion("reduced", async () => {
      const c = within(canvasElement);
      await userEvent.click(c.getByRole("button", { name: "다음 달" }));
      await waitFor(() => expect(c.getByRole("grid", { name: "2026년 12월" })).toBeInTheDocument());
      const slider = canvasElement.querySelector("[data-slot=calendar-month-body]")!;
      const body = c.getByRole("grid", { name: "2026년 12월" });
      // the slide starts from data-entering (no transition) and then eases to rest
      await waitFor(() => expect(slider).not.toHaveAttribute("data-entering"));
      const max = Math.max(...durationsMs(body));
      await expect(max).toBeGreaterThan(0);
      await expect(max).toBeLessThanOrEqual(120);
      await expect(getComputedStyle(body).transitionProperty).toContain("opacity");
      await expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim()).toBe("0");
      // selected wipe is a fade only
      const cell = cellOf(canvasElement, "2026-12-09");
      await userEvent.click(cell);
      await expect(Math.max(...durationsMs(cell))).toBeLessThanOrEqual(120);
      const before = Math.max(...getComputedStyle(cell, "::before").transitionDuration.split(",").map((v) => parseFloat(v) * (v.trim().endsWith("ms") ? 1 : 1000)));
      await expect(before).toBeLessThanOrEqual(120);
    });
  },
};

export const MotionOff: Story = {
  play: async ({ canvasElement }) => {
    await inMotion("off", async () => {
      const body = canvasElement.querySelector("table")!;
      await expect(Math.max(...durationsMs(body))).toBe(0);
    });
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} lang="ko" className="bg-yorha-bg p-4 text-yorha-fg">
          <Calendar
            today={TODAY}
            aria-label={`달력 (${THEME_LABEL[theme]})`}
            defaultValue={{ from: new Date(2026, 10, 9), to: new Date(2026, 10, 12) } as never}
            {...({ mode: "range" } as object)}
            isDateDisabled={(d) => d.getDate() === 20}
            renderDay={(d) => (d.getDate() === 25 ? <span className="size-1 bg-current" /> : null)}
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("grid", { name: "2026년 11월" })).toHaveLength(3);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" lang="ko" className="bg-yorha-panel p-4 text-yorha-fg">
      <Calendar today={TODAY} defaultValue={new Date(2026, 10, 9)} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(cellOf(canvasElement, "2026-11-09")).toHaveAttribute("aria-selected", "true");
  },
};

export const States: Story = {
  args: { minDate: new Date(2026, 10, 3), isDateDisabled: (d: Date) => d.getDate() === 20 },
  render: (args) => (
    <div className="flex flex-wrap gap-6">
      <Calendar {...args} defaultValue={new Date(2026, 10, 18)} />
      <Calendar mode="range" today={TODAY} defaultValue={{ from: new Date(2026, 10, 10), to: new Date(2026, 10, 12) }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(cellOf(canvasElement, "2026-11-18")).toHaveAttribute("aria-selected", "true");
    await expect(cellOf(canvasElement, "2026-11-20")).toHaveAttribute("aria-disabled", "true");
    await expect(cellOf(canvasElement, "2026-11-02")).toHaveAttribute("aria-disabled", "true");
    await expect(c.getAllByRole("button", { name: "다음 달" })[0]).toBeEnabled();
    await expectTargetSize(canvasElement);
    // day cells are gridcells, which the shared helper does not select: measure them directly
    const html = document.documentElement;
    for (const density of ["comfortable", "compact"]) {
      html.setAttribute("data-density", density);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const small = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=calendar-day]")]
        .map((el) => ({ date: el.dataset.date, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }))
        .filter((m) => m.w < 23.5 || m.h < 23.5);
      await expect(small, `${density}: day cells under 24px`).toEqual([]);
    }
    html.removeAttribute("data-density");
  },
};
