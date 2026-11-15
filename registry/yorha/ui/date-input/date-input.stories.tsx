import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { DateInput } from "./date-input";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };
const wrapper = (Story: React.ComponentType) => (
  <div lang="ko" className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
    <Story />
  </div>
);
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
const seconds = (el: Element) => parseFloat(getComputedStyle(el).transitionDuration) || 0;

const TODAY = new Date(2026, 10, 14);
const cellOf = (key: string) => document.querySelector<HTMLElement>(`[data-slot=calendar-day][data-date="${key}"]`)!;

const meta = {
  title: "컴포넌트/폼/DateInput",
  component: DateInput,
  tags: ["autodocs"],
  args: { label: "출발일", today: TODAY },
  decorators: [wrapper],
} satisfies Meta<typeof DateInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByLabelText("출발일") as HTMLInputElement;
    await expect(input).toHaveAttribute("type", "date");
    fireEvent.change(input, { target: { value: "2026-11-20" } });
    await expect(input).toHaveValue("2026-11-20");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-20");
  },
};

export const Types: Story = {
  render: () => (
    <div className="grid gap-4">
      <DateInput type="date" label="날짜" />
      <DateInput type="datetime-local" label="날짜와 시각" />
      <DateInput type="month" label="월" />
      <DateInput type="week" label="주" />
      <DateInput type="time" label="시각" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const [name, type, value] of [
      ["날짜", "date", "2026-11-20"],
      ["날짜와 시각", "datetime-local", "2026-11-20T09:30"],
      ["월", "month", "2026-11"],
      ["주", "week", "2026-W47"],
      ["시각", "time", "09:30"],
    ] as const) {
      const input = c.getByLabelText(name) as HTMLInputElement;
      await expect(input).toHaveAttribute("type", type);
      fireEvent.change(input, { target: { value } });
      await expect(input).toHaveValue(value);
    }
  },
};

export const MinMaxStep: Story = {
  render: () => (
    <div className="grid gap-4">
      <DateInput label="기간 내 날짜" min="2026-11-10" max="2026-11-20" picker />
      <DateInput type="time" label="15분 단위" step={900} min="09:00" max="18:00" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const date = c.getByLabelText("기간 내 날짜");
    await expect(date).toHaveAttribute("min", "2026-11-10");
    await expect(date).toHaveAttribute("max", "2026-11-20");
    const time = c.getByLabelText("15분 단위");
    await expect(time).toHaveAttribute("step", "900");
    await expect(time).toHaveAttribute("min", "09:00");
    await userEvent.click(c.getByRole("button", { name: "달력 열기" }));
    await waitFor(() => expect(cellOf("2026-11-14")).toBeTruthy());
    await expect(cellOf("2026-11-09")).toHaveAttribute("aria-disabled", "true");
    await expect(cellOf("2026-11-21")).toHaveAttribute("aria-disabled", "true");
    await expect(cellOf("2026-11-15")).not.toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const Picker: Story = {
  args: { picker: true, onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("출발일") as HTMLInputElement;
    const trigger = c.getByRole("button", { name: "달력 열기" });
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await waitFor(() => expect(cellOf("2026-11-20")).toBeTruthy());
    await userEvent.click(cellOf("2026-11-20"));
    await waitFor(() => expect(input).toHaveValue("2026-11-20"));
    await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-20");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
    // keyboard: open with Enter, Escape returns focus to the trigger
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** v4: every type has a kit picker on fine pointers; the type decides which one. */
export const PickerEveryType: Story = {
  render: () => <DateInput type="time" label="시각" picker />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button", { name: "달력 열기" })).toBeNull();
    await expect(within(canvasElement).getByRole("button", { name: "시간 선택" })).toBeInTheDocument();
  },
};

const openAndPick = async (canvasElement: HTMLElement, button: string, input: string, pick: () => Promise<void>, expected: string) => {
  const c = within(canvasElement);
  await userEvent.click(c.getByRole("button", { name: button }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  await pick();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await expect(c.getByLabelText(input, { selector: "input" })).toHaveValue(expected);
  await expect(c.getByRole("button", { name: button })).toHaveFocus();
};

/** type=week: the Calendar in week mode (ISO weeks, Monday start, 주 column, one ink band per week). */
export const WeekPicker: Story = {
  args: { type: "week", label: "주", defaultValue: "2026-W46" },
  play: ({ canvasElement }) => openAndPick(canvasElement, "주 선택", "주", () => userEvent.click(cellOf("2026-11-18")), "2026-W47"),
};

/** type=month: year header and a 3 x 4 grid. */
export const MonthPicker: Story = {
  args: { type: "month", label: "월", defaultValue: "2026-11" },
  play: ({ canvasElement }) => openAndPick(canvasElement, "월 선택", "월", () => userEvent.click(screen.getByRole("button", { name: "3월" })), "2026-03"),
};

/** type=time: hour and minute columns (a seconds column when step < 60). Enter or 확인 commits. */
export const TimePicker: Story = {
  args: { type: "time", label: "시각", defaultValue: "09:30" },
  play: ({ canvasElement }) =>
    openAndPick(
      canvasElement,
      "시간 선택",
      "시각",
      async () => {
        await userEvent.keyboard("{ArrowDown}{ArrowRight}{ArrowDown}{Enter}");
      },
      "10:31",
    ),
};

/** type=datetime-local: Calendar and TimePicker side by side, one commit with 확인. */
export const DateTimePicker: Story = {
  args: { type: "datetime-local", label: "날짜와 시각", defaultValue: "2026-11-14T09:30" },
  play: ({ canvasElement }) =>
    openAndPick(
      canvasElement,
      "날짜와 시각 선택",
      "날짜와 시각",
      async () => {
        await userEvent.click(cellOf("2026-11-18"));
        await userEvent.click(within(screen.getByRole("listbox", { name: "시" })).getByText("14"));
        await userEvent.click(screen.getByRole("button", { name: "확인" }));
      },
      "2026-11-18T14:30",
    ),
};

export const InvalidAndDisabled: Story = {
  render: () => (
    <div className="grid gap-4">
      <DateInput label="오류 날짜" error="날짜를 선택하세요" />
      <DateInput label="잠긴 날짜" disabled defaultValue="2026-11-14" picker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByLabelText("오류 날짜");
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad).toHaveAccessibleDescription(expect.stringContaining("날짜를 선택하세요"));
    await expect(c.getByLabelText("잠긴 날짜")).toBeDisabled();
    await expect(c.getAllByRole("button", { name: "달력 열기" }).at(-1)).toBeDisabled();
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("출발일");
    await inMotion("reduced", async () => expect(seconds(input)).toBeLessThanOrEqual(0.12));
    await inMotion("off", async () => expect(seconds(input)).toBe(0));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <DateInput label={`출발일 (${THEME_LABEL[t]})`} picker />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) await expect(c.getByLabelText(`출발일 (${THEME_LABEL[t]})`)).toBeInTheDocument();
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <DateInput label="오리지널 팔레트" picker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("오리지널 팔레트");
    await expect(input).toHaveAttribute("type", "date");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-4">
      <DateInput label="기본" today={TODAY} />
      <DateInput label="달력 포함" picker today={TODAY} />
      <DateInput label="오류" error="날짜를 선택하세요" />
      <DateInput label="잠김" disabled defaultValue="2026-11-14" picker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByLabelText("오류");
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad.getAttribute("aria-describedby") ?? "").toContain(c.getByRole("alert").id);
    await expect(c.getByLabelText("잠김")).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

/** v4: `picker="auto"` (default) = kit Calendar on fine pointers, native picker on coarse pointers; focus a segment to see the ink block. */
export const PickerAuto: Story = {
  args: { label: "출발일", today: TODAY, defaultValue: "2026-11-14" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "달력 열기" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
