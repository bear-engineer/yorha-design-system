import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { DatePicker, DateRangePicker, formatDate, parseDate } from "./date-picker";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };

/** 2026-11-14 is a Saturday. */
const TODAY = new Date(2026, 10, 14);

const cellOf = (key: string) => document.querySelector<HTMLElement>(`[data-slot=calendar-day][data-date="${key}"]`)!;
const activeKey = () => (document.activeElement as HTMLElement | null)?.dataset.date;
const ymd = (d: Date | null | undefined) => (d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null);
const popup = () => screen.queryByRole("dialog");
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
  title: "컴포넌트/날짜/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  args: { label: "출발일", today: TODAY },
  decorators: [
    (Story) => (
      <div lang="ko" className="min-h-[28rem] w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FormatAndParse: Story = {
  play: async () => {
    // locale format + parse helpers (ko-KR)
    await expect(formatDate(TODAY, "ko-KR")).toBe("2026. 11. 14.");
    await expect(ymd(parseDate("2026. 11. 14.", "ko-KR"))).toEqual([2026, 11, 14]);
    await expect(ymd(parseDate("2026-11-20", "ko-KR"))).toEqual([2026, 11, 20]);
    await expect(ymd(parseDate("20261120", "ko-KR"))).toEqual([2026, 11, 20]);
    await expect(parseDate("2026. 13. 40.", "ko-KR")).toBeNull();
    await expect(parseDate("2026. 02. 30.", "ko-KR")).toBeNull();
    await expect(parseDate("abc", "ko-KR")).toBeNull();
    await expect(ymd(parseDate("11/20/2026", "en-US"))).toEqual([2026, 11, 20]);
  },
};

export const TypedDateParsedOnBlur: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "출발일" });
    await userEvent.type(input, "20261120");
    await expect(args.onValueChange).not.toHaveBeenCalled();
    await userEvent.tab();
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledTimes(1));
    await expect(ymd((args.onValueChange as ReturnType<typeof fn>).mock.calls[0]![0] as Date)).toEqual([2026, 11, 20]);
    await expect(input).toHaveValue("2026. 11. 20.");
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
    // clearing the text clears the value
    await userEvent.clear(input);
    await userEvent.tab();
    await waitFor(() => expect(args.onValueChange).toHaveBeenLastCalledWith(null));
  },
};

export const InvalidTextShowsFieldError: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "출발일" });
    await userEvent.type(input, "abc");
    await userEvent.tab();
    await waitFor(() => expect(c.getByRole("alert")).toHaveTextContent("날짜 형식"));
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(expect.stringContaining("날짜 형식"));
    // fixing the text clears the error
    await userEvent.clear(input);
    await userEvent.type(input, "2026. 11. 21.");
    await userEvent.tab();
    await waitFor(() => expect(c.queryByRole("alert")).toBeNull());
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
  },
};

export const OutOfRangeIsInvalid: Story = {
  args: { minDate: new Date(2026, 10, 10), maxDate: new Date(2026, 10, 20) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "출발일" });
    await userEvent.type(input, "2026. 11. 25.");
    await userEvent.tab();
    await waitFor(() => expect(c.getByRole("alert")).toHaveTextContent("선택할 수 없는"));
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const FieldIntegration: Story = {
  args: { description: "YYYY. MM. DD. 형식으로 입력하거나 달력에서 고른다.", error: "출발일은 필수다." },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("출발일", { selector: "input" });
    await expect(input).toBe(c.getByRole("textbox", { name: "출발일" }));
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(expect.stringContaining("형식으로 입력"));
    await expect(input).toHaveAccessibleDescription(expect.stringContaining("필수"));
    await expect(c.getByRole("alert")).toHaveTextContent("출발일은 필수다.");
    // the trigger is a separate, named button
    await expect(c.getByRole("button", { name: "달력 열기" })).toBeInTheDocument();
  },
};

export const PickerOpensAndFocusReturns: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole("button", { name: "달력 열기" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await waitFor(() => expect(popup()).not.toBeNull());
    const grid = await screen.findByRole("grid", { name: "2026년 11월" });
    await expect(grid).toBeInTheDocument();
    // focus lands on the roving day inside the grid
    await waitFor(() => expect(activeKey()).toBe("2026-11-14"));
    // Escape closes and focus returns to the trigger
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
    await expect(trigger).toHaveFocus();
    // pick a day with the pointer: closes, fills the input, focus returns
    await userEvent.click(trigger);
    await screen.findByRole("grid", { name: "2026년 11월" });
    await userEvent.click(cellOf("2026-11-20"));
    await waitFor(() => expect(popup()).toBeNull());
    await expect(c.getByRole("textbox", { name: "출발일" })).toHaveValue("2026. 11. 20.");
    await expect(trigger).toHaveFocus();
    await expect(ymd((args.onValueChange as ReturnType<typeof fn>).mock.calls.at(-1)![0] as Date)).toEqual([2026, 11, 20]);
    // reopen: the selected day is the focus target and selected
    await userEvent.click(trigger);
    await waitFor(() => expect(activeKey()).toBe("2026-11-20"));
    await expect(cellOf("2026-11-20")).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
  },
};

export const KeyboardOnly: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "출발일" });
    const trigger = c.getByRole("button", { name: "달력 열기" });
    await userEvent.click(input);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(activeKey()).toBe("2026-11-14"));
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{Enter}");
    await waitFor(() => expect(popup()).toBeNull());
    await expect(input).toHaveValue("2026. 11. 16.");
    await expect(trigger).toHaveFocus();
  },
};

export const ControlledValue: Story = {
  args: { value: new Date(2026, 10, 3) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox", { name: "출발일" })).toHaveValue("2026. 11. 03.");
    await userEvent.click(within(canvasElement).getByRole("button", { name: "달력 열기" }));
    await waitFor(() => expect(activeKey()).toBe("2026-11-03"));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
  },
};

export const Range: StoryObj<typeof DateRangePicker> = {
  render: (args) => <DateRangePicker {...args} />,
  args: { label: "체류 기간", today: TODAY, onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "체류 기간" });
    const trigger = c.getByRole("button", { name: "달력 열기" });
    await userEvent.click(trigger);
    await screen.findByRole("grid", { name: "2026년 11월" });
    await userEvent.click(cellOf("2026-11-10"));
    // still open after the first click
    await expect(popup()).not.toBeNull();
    await userEvent.click(cellOf("2026-11-15"));
    await waitFor(() => expect(popup()).toBeNull());
    await expect(input).toHaveValue("2026. 11. 10. – 2026. 11. 15.");
    await expect(trigger).toHaveFocus();
    const last = (args.onValueChange as ReturnType<typeof fn>).mock.calls.at(-1)![0] as { from: Date; to: Date };
    await expect([ymd(last.from), ymd(last.to)]).toEqual([[2026, 11, 10], [2026, 11, 15]]);
    // typed range, either order, with ~ or hyphen
    await userEvent.clear(input);
    await userEvent.type(input, "2026-11-25 ~ 2026-11-20");
    await userEvent.tab();
    await waitFor(() => expect(input).toHaveValue("2026. 11. 20. – 2026. 11. 25."));
    // reopening shows the range
    await userEvent.click(trigger);
    await screen.findByRole("grid", { name: "2026년 11월" });
    await expect(cellOf("2026-11-22")).toHaveAttribute("data-in-range");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
  },
};

export const RangeInvalidText: StoryObj<typeof DateRangePicker> = {
  render: (args) => <DateRangePicker {...args} />,
  args: { label: "체류 기간", today: TODAY },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "체류 기간" });
    await userEvent.type(input, "2026. 11. 10.");
    await userEvent.tab();
    await waitFor(() => expect(c.getByRole("alert")).toBeInTheDocument());
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    await inMotion("reduced", async () => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "달력 열기" }));
      const dialog = await screen.findByRole("dialog");
      await waitFor(() => expect(getComputedStyle(dialog).transitionProperty).not.toBe("none"));
      await expect(Math.max(...durationsMs(dialog))).toBeLessThanOrEqual(120);
      await expect(getComputedStyle(dialog).transitionProperty).toContain("opacity");
      const body = dialog.querySelector("[data-slot=calendar-month-body]")!;
      await expect(Math.max(...durationsMs(body))).toBeLessThanOrEqual(120);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(popup()).toBeNull());
    });
  },
};

// Overlays are portaled: the theme gallery shows the closed pickers (inputs); the popup is covered by the stories above.
export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} lang="ko" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <DatePicker label={`출발일 (${THEME_LABEL[theme]})`} today={TODAY} defaultValue={new Date(2026, 10, 9)} description="달력 또는 직접 입력" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const theme of THEMES) {
      await expect(within(canvasElement).getByRole("textbox", { name: `출발일 (${THEME_LABEL[theme]})` })).toHaveValue("2026. 11. 09.");
    }
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" lang="ko" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <DatePicker label="출발일 (오리지널)" today={TODAY} error="날짜를 확인하라." />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox", { name: "출발일 (오리지널)" })).toHaveAttribute("aria-invalid", "true");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <DatePicker label="기본" today={TODAY} />
      <DatePicker label="오류" today={TODAY} defaultValue={null as never} />
      <DatePicker label="잠김" today={TODAY} disabled />
      <DateRangePicker label="기간" today={TODAY} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByRole("textbox", { name: "오류" });
    await userEvent.type(bad, "abc");
    await userEvent.tab();
    await waitFor(() => expect(c.getByRole("alert")).toHaveTextContent("날짜 형식"));
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad.getAttribute("aria-describedby") ?? "").toContain(c.getByRole("alert").id);
    await expect(c.getByRole("textbox", { name: "잠김" })).toBeDisabled();
    // focus stays on the trigger after opening and closing the picker
    const trigger = c.getAllByRole("button", { name: "달력 열기" })[0]!;
    await userEvent.click(trigger);
    await screen.findByRole("grid");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
    await expect(trigger).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};
